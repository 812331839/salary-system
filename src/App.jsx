import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// 员工信息（工号/姓名/密码）
const EMPLOYEE_LIST_KEY = 'employee_list';
// 员工填写的工资申请数据
const FORM_DATA_KEY = 'salary_form_data_map';
// 老板娘对每条申请的审核数据（单价/出差补贴/提成批准等）
const REVIEW_DATA_KEY = 'salary_review_data_map';

/** 应用主入口 */
const App = () => {
  // 角色：employee 或 boss
  const [role, setRole] = useState(() => localStorage.getItem('login_role') || '');
  const [bossAuth, setBossAuth] = useState(false);

  useEffect(() => {
    if (role === 'boss') setBossAuth(true);
  }, [role]);

  if (!role) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">请选择登录身份</h2>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => {
              localStorage.setItem('login_role', 'employee');
              setRole('employee');
            }}
            className="bg-blue-600 text-white py-2 rounded"
          >
            我是员工
          </button>
          <button
            onClick={() => {
              const input = prompt('请输入老板娘密码');
              if (input === '123456') {
                localStorage.setItem('login_role', 'boss');
                setBossAuth(true);
                setRole('boss');
              } else {
                alert('密码错误');
              }
            }}
            className="bg-green-600 text-white py-2 rounded"
          >
            我是老板娘
          </button>
        </div>
      </div>
    );
  }

  if (role === 'boss' && bossAuth) return <BossDashboard />;
  if (role === 'employee') return <EmployeePage />;
  return null;
};

/* ================================
   老板娘端：查看员工申请、设置单价/补贴、审批、导出
   ================================ */
const BossDashboard = () => {
  const [employeeList, setEmployeeList] = useState([]);
  const [formDataMap, setFormDataMap] = useState({});
  const [reviewDataMap, setReviewDataMap] = useState({});

  const [selectedKey, setSelectedKey] = useState(null);

  // 用于添加新员工
  const [newEmp, setNewEmp] = useState({ empId: '', name: '', password: '' });

  // 加载本地存储
  const loadData = () => {
    const emp = localStorage.getItem(EMPLOYEE_LIST_KEY);
    const form = localStorage.getItem(FORM_DATA_KEY);
    const review = localStorage.getItem(REVIEW_DATA_KEY);
    setEmployeeList(emp ? JSON.parse(emp) : []);
    setFormDataMap(form ? JSON.parse(form) : {});
    setReviewDataMap(review ? JSON.parse(review) : {});
  };

  useEffect(() => {
    loadData();
  }, []);

  // 保存 reviewDataMap
  const saveReviewData = (updatedMap) => {
    setReviewDataMap(updatedMap);
    localStorage.setItem(REVIEW_DATA_KEY, JSON.stringify(updatedMap));
  };

  // 添加员工
  const handleAddEmployee = () => {
    if (!newEmp.empId || !newEmp.name || !newEmp.password) {
      return alert('请填写完整信息');
    }
    const updated = [...employeeList, newEmp];
    setEmployeeList(updated);
    localStorage.setItem(EMPLOYEE_LIST_KEY, JSON.stringify(updated));
    setNewEmp({ empId: '', name: '', password: '' });
  };

  // 过滤出已提交的申请
  const submittedKeys = Object.keys(formDataMap).filter(
    (k) => formDataMap[k].status === '已提交'
  );

  // 当前选中的申请
  const selectedForm = selectedKey ? formDataMap[selectedKey] : null;

  // 老板娘审核信息对象
  const myReview = selectedKey
    ? reviewDataMap[selectedKey] || {
        travelSupplement: 50,
        inquiryPriceArr: []
      }
    : null;

  // 计算公式文本
  const calcFormula = () => {
    if (!selectedForm || !myReview) return '';
    const baseStr = `(${selectedForm.totalWorkdays} * 6000 / ${selectedForm.legalWorkdays})`;
    const remoteStr = `+ ${selectedForm.remoteHours} * 30`;

    let inquiryStr = '';
    if (selectedForm.projects?.length) {
      inquiryStr = selectedForm.projects
        .map((proj, idx) => {
          const price = myReview.inquiryPriceArr[idx] || 30;
          return `+ ${proj.count} * ${price}`;
        })
        .join(' ');
    }

    const travelStr = `+ ${selectedForm.travelDays} * ${myReview.travelSupplement}`;
    return `${baseStr} ${remoteStr} ${inquiryStr} ${travelStr}`;
  };

  // 计算实际数值
  const calcTotal = () => {
    if (!selectedForm || !myReview) return 0;
    const base =
      (6000 / Number(selectedForm.legalWorkdays || 1)) *
      Number(selectedForm.totalWorkdays || 0);
    const remote = Number(selectedForm.remoteHours || 0) * 30;

    let inquirySum = 0;
    (selectedForm.projects || []).forEach((proj, idx) => {
      const price = myReview.inquiryPriceArr[idx] || 30;
      inquirySum += Number(proj.count || 0) * price;
    });

    const travel = Number(selectedForm.travelDays || 0) * myReview.travelSupplement;
    return base + remote + inquirySum + travel;
  };

  // 当老板娘修改某条询盘的单价
  const handleInquiryPriceChange = (idx, newVal) => {
    if (!selectedKey) return;
    const arr = [...(myReview.inquiryPriceArr || [])];
    arr[idx] = Number(newVal);
    const updatedReview = { ...myReview, inquiryPriceArr: arr };
    const newMap = { ...reviewDataMap, [selectedKey]: updatedReview };
    saveReviewData(newMap);
  };

  // 出差补贴修改
  const handleTravelChange = (val) => {
    if (!selectedKey) return;
    const updatedReview = { ...myReview, travelSupplement: Number(val) };
    const newMap = { ...reviewDataMap, [selectedKey]: updatedReview };
    saveReviewData(newMap);
  };

  // 确认申请
  const confirmApply = () => {
    if (!selectedKey) return;
    const updatedForm = { ...formDataMap[selectedKey], status: '已确认' };
    const newFormMap = { ...formDataMap, [selectedKey]: updatedForm };
    setFormDataMap(newFormMap);
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(newFormMap));
    alert('已确认该申请');
    setSelectedKey(null);
  };

  // 导出 Excel (仅已确认)
  const exportExcel = () => {
    const confirmed = Object.keys(formDataMap).filter(
      (k) => formDataMap[k].status === '已确认'
    );
    const rows = [
      ['工号', '姓名', '月份', '法定日', '线下日', '线上时', '出差天数', '合计']
    ];

    confirmed.forEach((key) => {
      const f = formDataMap[key];
      const r = reviewDataMap[key] || {
        travelSupplement: 50,
        inquiryPriceArr: []
      };

      const total = calcTotalWith(f, r);
      rows.push([
        f.empId,
        f.name,
        f.month,
        f.legalWorkdays,
        f.totalWorkdays,
        f.remoteHours,
        f.travelDays,
        total.toFixed(2)
      ]);
    });

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '已确认工资.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const calcTotalWith = (f, r) => {
    const base =
      (6000 / Number(f.legalWorkdays || 1)) * Number(f.totalWorkdays || 0);
    const remote = Number(f.remoteHours || 0) * 30;

    let inquirySum = 0;
    (f.projects || []).forEach((proj, idx) => {
      const price = r.inquiryPriceArr[idx] || 30;
      inquirySum += Number(proj.count || 0) * price;
    });

    const travel = (f.travelDays || 0) * (r.travelSupplement || 50);
    return base + remote + inquirySum + travel;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">老板娘审核系统</h2>
        <div>
          <button onClick={loadData} className="text-sm text-blue-600 underline mr-4">
            刷新
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('login_role');
              window.location.reload();
            }}
            className="text-sm text-blue-600 underline"
          >
            返回首页
          </button>
        </div>
      </div>

      <div className="border p-4 rounded mb-6">
        <h3 className="font-semibold mb-2">员工信息管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <input
            placeholder="工号"
            value={newEmp.empId}
            onChange={(e) => setNewEmp({ ...newEmp, empId: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            placeholder="姓名"
            value={newEmp.name}
            onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            placeholder="密码"
            value={newEmp.password}
            onChange={(e) => setNewEmp({ ...newEmp, password: e.target.value })}
            className="border p-2 rounded"
          />
        </div>
        <button
          onClick={handleAddEmployee}
          className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        >
          添加员工
        </button>
        <ul className="text-sm list-disc pl-5">
          {employeeList.map((emp) => (
            <li key={emp.empId}>
              {emp.empId} - {emp.name}
            </li>
          ))}
        </ul>
      </div>

      <h3 className="font-semibold text-lg mb-2">已提交的工资申请</h3>
      <ul className="list-disc pl-5 text-sm mb-4">
        {submittedKeys.length === 0 && <li className="text-gray-600">暂无已提交申请</li>}
        {submittedKeys.map((k) => (
          <li key={k} className="cursor-pointer text-blue-600" onClick={() => setSelectedKey(k)}>
            {k}（{formDataMap[k].name}）
          </li>
        ))}
      </ul>

      {selectedForm && (
        <div className="bg-gray-50 p-4 border rounded">
          <h4 className="font-semibold mb-2">
            审核：{selectedForm.name}（{selectedForm.empId}） - {selectedForm.month}
          </h4>
          <p>法定工作日：{selectedForm.legalWorkdays}</p>
          <p>线下工作日：{selectedForm.totalWorkdays}</p>
          <p>线上小时：{selectedForm.remoteHours}</p>
          <p>出差天数：{selectedForm.travelDays}</p>
          <div className="mt-4">
            <h5 className="font-semibold mb-2">询盘列表（多条，每条单价30~50）</h5>
            {selectedForm.projects?.map((proj, idx) => {
              const linePrice = myReview.inquiryPriceArr[idx] || 30;
              return (
                <div key={idx} className="mb-2 flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    {proj.name} × {proj.count}
                  </span>
                  <input
                    type="number"
                    className="border p-1 rounded w-20"
                    value={linePrice}
                    onChange={(e) => handleInquiryPriceChange(idx, e.target.value)}
                  />
                  <span className="text-sm">单价</span>
                </div>
              );
            })}
          </div>

          <div className="mt-2">
            <label className="text-sm">
              出差补贴/天：
              <input
                type="number"
                className="border p-1 rounded ml-2 w-20"
                value={myReview.travelSupplement}
                onChange={(e) => handleTravelChange(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-4">
            <h5 className="font-semibold">计算公式</h5>
            <p className="bg-white border p-2 rounded text-sm text-gray-800">
              {calcFormula()} = {calcTotal().toFixed(2)}
            </p>
          </div>

          <button onClick={confirmApply} className="bg-green-600 text-white px-4 py-2 rounded mt-3">
            确认该申请
          </button>
        </div>
      )}

      <div className="mt-8">
        <button onClick={exportExcel} className="bg-purple-600 text-white px-4 py-2 rounded">
          导出已确认工资Excel
        </button>
      </div>
    </div>
  );
};

/* ================================
   员工端：填写多条项目 + 出差 + 提交
   ================================ */
const EmployeePage = () => {
  const [employeeList, setEmployeeList] = useState([]);
  const [formDataMap, setFormDataMap] = useState({});
  const [loginInfo, setLoginInfo] = useState({ empId: '', name: '', password: '' });
  const [loggedInEmp, setLoggedInEmp] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const emp = localStorage.getItem(EMPLOYEE_LIST_KEY);
    const form = localStorage.getItem(FORM_DATA_KEY);
    setEmployeeList(emp ? JSON.parse(emp) : []);
    setFormDataMap(form ? JSON.parse(form) : {});
  }, []);

  // 保存到 localStorage
  const updateFormData = (key, data) => {
    const updated = { ...formDataMap, [key]: data };
    setFormDataMap(updated);
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(updated));
  };

  // 登录
  const handleLogin = () => {
    const match = employeeList.find(
      (e) => e.empId === loginInfo.empId && e.name === loginInfo.name && e.password === loginInfo.password
    );
    if (match) {
      setLoggedInEmp(match);
      localStorage.setItem('login_role', 'employee');
    } else {
      alert('未找到员工信息或密码错误');
    }
  };

  if (!loggedInEmp) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">员工登录</h2>
        <input
          placeholder="工号"
          className="border p-2 w-full mb-2"
          value={loginInfo.empId}
          onChange={(e) => setLoginInfo({ ...loginInfo, empId: e.target.value })}
        />
        <input
          placeholder="姓名"
          className="border p-2 w-full mb-2"
          value={loginInfo.name}
          onChange={(e) => setLoginInfo({ ...loginInfo, name: e.target.value })}
        />
        <input
          type="password"
          placeholder="密码"
          className="border p-2 w-full mb-4"
          value={loginInfo.password}
          onChange={(e) => setLoginInfo({ ...loginInfo, password: e.target.value })}
        />
        <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded w-full">
          登录
        </button>
      </div>
    );
  }

  // 当前月份表单key
  const formKey = `${loggedInEmp.empId}_${currentMonth}`;
  const myForm = formDataMap[formKey] || {
    empId: loggedInEmp.empId,
    name: loggedInEmp.name,
    month: currentMonth,
    legalWorkdays: '',
    totalWorkdays: '',
    remoteHours: '',
    // 多条项目(询盘)
    projects: [],
    // 出差天数
    travelDays: '',
    status: '未提交'
  };

  const [localForm, setLocalForm] = useState(myForm);

  useEffect(() => {
    setLocalForm(myForm);
  }, [myForm]);

  // 更新输入
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLocalForm((prev) => ({ ...prev, [name]: value }));
  };

  // 员工点击+添加项目
  const addProject = () => {
    const arr = [...localForm.projects];
    arr.push({
      name: '',
      count: '',
      note: ''
    });
    setLocalForm({ ...localForm, projects: arr });
  };

  const updateProject = (idx, field, val) => {
    const arr = [...localForm.projects];
    arr[idx][field] = val;
    setLocalForm({ ...localForm, projects: arr });
  };

  // 保存草稿
  const handleSave = () => {
    updateFormData(formKey, localForm);
    alert('已保存草稿');
  };

  // 提交
  const handleSubmit = () => {
    const updated = { ...localForm, status: '已提交' };
    updateFormData(formKey, updated);
    setLocalForm(updated);
    alert('提交成功');
  };

  // 是否只读
  const isReadOnly = localForm.status !== '未提交';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">员工工资申请</h2>
      <div className="mb-2 flex justify-between">
        <div>
          <p>
            姓名：{loggedInEmp.name}（{loggedInEmp.empId}）
          </p>
          <p>月份：{currentMonth.replace('-', '年')}月</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('login_role');
            window.location.reload();
          }}
          className="text-sm text-blue-600 underline"
        >
          返回首页
        </button>
      </div>

      <input
        type="month"
        value={currentMonth}
        onChange={(e) => setCurrentMonth(e.target.value)}
        className="border p-2 rounded mb-4"
      />

      <div className="mb-4">
        <h3 className="font-semibold mb-2">1. 基础信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            name="legalWorkdays"
            placeholder="法定工作日"
            value={localForm.legalWorkdays}
            onChange={handleFormChange}
            className="border p-2 rounded"
            disabled={isReadOnly}
          />
          <input
            name="totalWorkdays"
            placeholder="线下工作日"
            value={localForm.totalWorkdays}
            onChange={handleFormChange}
            className="border p-2 rounded"
            disabled={isReadOnly}
          />
          <input
            name="remoteHours"
            placeholder="线上小时数"
            value={localForm.remoteHours}
            onChange={handleFormChange}
            className="border p-2 rounded"
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold mb-2">2. 询盘（项目）& 出差</h3>
        {localForm.projects.map((proj, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <input
              placeholder="项目名称"
              value={proj.name}
              onChange={(e) => updateProject(idx, 'name', e.target.value)}
              className="border p-2 rounded"
              disabled={isReadOnly}
            />
            <input
              placeholder="数量"
              value={proj.count}
              onChange={(e) => updateProject(idx, 'count', e.target.value)}
              className="border p-2 rounded"
              disabled={isReadOnly}
            />
            <input
              placeholder="备注"
              value={proj.note}
              onChange={(e) => updateProject(idx, 'note', e.target.value)}
              className="border p-2 rounded"
              disabled={isReadOnly}
            />
          </div>
        ))}
        {!isReadOnly && (
          <button onClick={addProject} className="text-sm text-blue-600 mb-2">
            + 添加新询盘
          </button>
        )}
        <input
          name="travelDays"
          placeholder="出差天数"
          value={localForm.travelDays}
          onChange={handleFormChange}
          className="border p-2 rounded w-full"
          disabled={isReadOnly}
        />
      </div>

      <div className="flex gap-4 mt-4">
        {!isReadOnly && (
          <>
            <button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded">
              提交
            </button>
            <button onClick={handleSave} className="bg-gray-600 text-white px-4 py-2 rounded">
              保存草稿
            </button>
          </>
        )}
        <span className="text-gray-700 text-sm self-center">
          状态：{localForm.status}
        </span>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
