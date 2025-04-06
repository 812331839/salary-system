// 需求：
// 1. 员工端移除法定工作日 (legalWorkdays)，由老板娘端设置统一的法定工作日
// 2. 员工端添加一个新的“提成项目”列表(commissionList)，可多条，每条含 { name, count, note }
// 3. 保持询盘(projects)不变，也可多条
// 4. 老板娘端设置 legalWorkdays，并参与公式计算： base = (6000 / legalWorkdays) * totalWorkdays

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// 员工列表(仅工号+姓名)
const EMPLOYEE_LIST_KEY = 'employee_list';
// 员工填写的工资表单
const FORM_DATA_KEY = 'salary_form_data_map';
// 老板娘对某条申请的审核数据
const REVIEW_DATA_KEY = 'salary_review_data_map';

function App() {
  const [role, setRole] = useState(() => localStorage.getItem('login_role') || '');
  const [bossAuth, setBossAuth] = useState(false);

  useEffect(() => {
    if (role === 'boss') {
      setBossAuth(true);
    }
  }, [role]);

  if (!role) {
    return (
      <div className="p-6 min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">请选择登录身份</h2>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                localStorage.setItem('login_role', 'employee');
                setRole('employee');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
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
              className="bg-green-600 hover:bg-green-700 text-white py-2 rounded"
            >
              我是老板娘
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'boss' && bossAuth) return <BossDashboard />;
  if (role === 'employee') return <EmployeePage />;
  return null;
}

/* ================================
   老板娘端
 ================================ */
function BossDashboard() {
  const [employeeList, setEmployeeList] = useState([]);
  const [formDataMap, setFormDataMap] = useState({});
  const [reviewDataMap, setReviewDataMap] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);

  // 添加新员工(工号+姓名)
  const [newEmp, setNewEmp] = useState({ empId: '', name: '' });

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

  const saveReviewData = (newMap) => {
    setReviewDataMap(newMap);
    localStorage.setItem(REVIEW_DATA_KEY, JSON.stringify(newMap));
  };

  const handleAddEmployee = () => {
    if (!newEmp.empId || !newEmp.name) {
      alert('请输入工号和姓名');
      return;
    }
    const updated = [...employeeList, newEmp];
    setEmployeeList(updated);
    localStorage.setItem(EMPLOYEE_LIST_KEY, JSON.stringify(updated));
    setNewEmp({ empId: '', name: '' });
  };

  // 已提交
  const submittedKeys = Object.keys(formDataMap).filter(
    (k) => formDataMap[k].status === '已提交'
  );
  const selectedForm = selectedKey ? formDataMap[selectedKey] : null;

  // 每条申请的审核数据
  // 新增 legalWorkdays 由老板娘端填
  // travelSupplement / inquiryPriceArr 保持
  // 另外还可针对提成(commissionList)后续扩展
  const myReview = selectedKey
    ? reviewDataMap[selectedKey] || {
        legalWorkdays: 22, // 默认
        travelSupplement: 50,
        inquiryPriceArr: [],
      }
    : null;

  // 公式文本
  const calcFormula = () => {
    if (!selectedForm || !myReview) return '';
    // base: (6000 / legalWorkdays) * totalWorkdays
    const base = `(${selectedForm.totalWorkdays}*6000/${myReview.legalWorkdays})`;
    const remote = `+ ${selectedForm.remoteHours}*30`;

    // 询盘项目
    let inquiryStr = '';
    if (selectedForm.inquiryList?.length) {
      inquiryStr = selectedForm.inquiryList
        .map((p, idx) => {
          const linePrice = myReview.inquiryPriceArr[idx] || 30;
          return `+ ${p.count}*${linePrice}`;
        })
        .join(' ');
    }

    // 提成项目(commissionList), 这里暂示例固定approve
    let commStr = '';
    if (selectedForm.commissionList?.length) {
      commStr = selectedForm.commissionList
        .map((c) => `+ ${c.count}*提成单价?`)
        .join(' ');
    }

    const travel = `+ ${selectedForm.travelDays}*${myReview.travelSupplement}`;

    return `${base} ${remote} ${inquiryStr} ${commStr} ${travel}`;
  };

  const calcTotal = () => {
    if (!selectedForm || !myReview) return 0;
    // base
    const base =
      (6000 / Number(myReview.legalWorkdays || 1)) * Number(selectedForm.totalWorkdays || 0);
    const remote = Number(selectedForm.remoteHours || 0) * 30;

    // 询盘
    let inquirySum = 0;
    if (selectedForm.inquiryList) {
      selectedForm.inquiryList.forEach((p, idx) => {
        const price = myReview.inquiryPriceArr[idx] || 30;
        inquirySum += (Number(p.count || 0) * price);
      });
    }

    // 提成
    // 这里简化写死, 也可以让老板娘设置多条提成单价...
    let commissionSum = 0;
    if (selectedForm.commissionList) {
      selectedForm.commissionList.forEach((c) => {
        // TODO: 这里可加boss的批准逻辑 or c.price
        // 暂写成 c.count*100
        commissionSum += Number(c.count || 0) * 100;
      });
    }

    const travel = Number(selectedForm.travelDays || 0) * (myReview.travelSupplement || 50);

    return base + remote + inquirySum + commissionSum + travel;
  };

  // 设置 legalWorkdays
  const handleLegalWorkdaysChange = (val) => {
    if (!selectedKey) return;
    const updatedReview = { ...myReview, legalWorkdays: Number(val) };
    const newMap = { ...reviewDataMap, [selectedKey]: updatedReview };
    saveReviewData(newMap);
  };

  // 设置询盘单价
  const handleInquiryPriceChange = (idx, val) => {
    if (!selectedKey) return;
    const arr = [...(myReview.inquiryPriceArr || [])];
    arr[idx] = Number(val);
    const updatedReview = { ...myReview, inquiryPriceArr: arr };
    const newMap = { ...reviewDataMap, [selectedKey]: updatedReview };
    saveReviewData(newMap);
  };

  // 出差补贴
  const handleTravelChange = (val) => {
    if (!selectedKey) return;
    const updatedReview = { ...myReview, travelSupplement: Number(val) };
    const newMap = { ...reviewDataMap, [selectedKey]: updatedReview };
    saveReviewData(newMap);
  };

  const confirmApply = () => {
    if (!selectedKey) return;
    const updated = { ...selectedForm, status: '已确认' };
    const newMap = { ...formDataMap, [selectedKey]: updated };
    setFormDataMap(newMap);
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(newMap));
    alert('已确认该申请');
    setSelectedKey(null);
  };

  const exportExcel = () => {
    const confirmed = Object.keys(formDataMap).filter(
      (k) => formDataMap[k].status === '已确认'
    );
    if (confirmed.length === 0) {
      alert('没有已确认的记录');
      return;
    }
    const rows = [
      ['工号','姓名','月份','线下日','线上时','出差天','合计']
    ];
    confirmed.forEach((key) => {
      const f = formDataMap[key];
      const r = reviewDataMap[key] || {
        legalWorkdays: 22,
        travelSupplement: 50,
        inquiryPriceArr: []
      };
      const total = calcTotalWith(f, r);
      rows.push([
        f.empId,
        f.name,
        f.month,
        f.totalWorkdays,
        f.remoteHours,
        f.travelDays,
        total.toFixed(2)
      ]);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
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
    // base = (6000 / r.legalWorkdays) * f.totalWorkdays
    const base = (6000 / (r.legalWorkdays||1)) * (f.totalWorkdays||0);
    const remote = (f.remoteHours||0)*30;

    // inquiry sum
    let inquirySum = 0;
    if (f.inquiryList) {
      f.inquiryList.forEach((p, idx) => {
        const price = r.inquiryPriceArr[idx] || 30;
        inquirySum += (Number(p.count||0)*price);
      });
    }

    // commission sum
    let commissionSum = 0;
    if (f.commissionList) {
      f.commissionList.forEach((c) => {
        // 暂写 c.count*100 作为提成
        commissionSum += Number(c.count||0)*100;
      });
    }

    const travel = (f.travelDays||0)*(r.travelSupplement||50);
    return base + remote + inquirySum + commissionSum + travel;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white shadow-lg p-6 rounded mb-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-2xl font-bold">老板娘后台</h2>
          <div className="flex gap-4">
            <button onClick={loadData} className="text-sm text-blue-600 underline">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
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
          </div>
          <button
            onClick={handleAddEmployee}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            添加员工
          </button>
          <ul className="text-sm list-disc pl-5 mt-2">
            {employeeList.map((emp) => (
              <li key={emp.empId}>
                {emp.empId} - {emp.name}
              </li>
            ))}
          </ul>
        </div>

        <h3 className="font-semibold text-lg mb-2">已提交的工资申请</h3>
        {submittedKeys.length === 0 && (
          <p className="text-gray-600 text-sm">暂无已提交的申请</p>
        )}
        <ul className="list-disc pl-5 text-sm mb-4">
          {submittedKeys.map((k) => (
            <li
              key={k}
              className="cursor-pointer text-blue-600 underline"
              onClick={() => setSelectedKey(k)}
            >
              {k}（{formDataMap[k].name}）
            </li>
          ))}
        </ul>

        {selectedForm && (
          <div className="bg-gray-50 p-4 border rounded mt-4">
            <h4 className="font-semibold mb-2">
              审核 {selectedForm.name}（{selectedForm.empId}） - {selectedForm.month}
            </h4>

            <div className="mb-2">
              <label className="text-sm">
                法定工作日：
                <input
                  type="number"
                  className="border p-1 rounded ml-2 w-20"
                  value={myReview.legalWorkdays || ''}
                  onChange={(e) => handleLegalWorkdaysChange(e.target.value)}
                />
              </label>
            </div>

            <p>线下工作日：{selectedForm.totalWorkdays}</p>
            <p>线上小时：{selectedForm.remoteHours}</p>
            <div className="mt-2">
              <p className="font-semibold">询盘( inquiryList )：</p>
              {selectedForm.inquiryList?.map((p, idx) => {
                const linePrice = myReview.inquiryPriceArr[idx] || 30;
                return (
                  <div key={idx} className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-700">
                      {p.name} × {p.count}
                    </span>
                    <input
                      type="number"
                      className="border p-1 rounded w-20"
                      value={linePrice}
                      onChange={(e) => handleInquiryPriceChange(idx, e.target.value)}
                    />
                    <span className="text-xs">单价</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-2">
              <p className="font-semibold">提成( commissionList )：</p>
              {selectedForm.commissionList?.map((c, idx) => (
                <div key={idx} className="text-sm text-gray-700">
                  {c.name} × {c.count}（备注：{c.note}）
                  {/* 可以在这里加一个老板娘是否批准的checkbox或单价输入等逻辑 */}
                </div>
              ))}
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

            <p className="mt-2">出差天数：{selectedForm.travelDays}</p>

            <div className="mt-3">
              <p className="font-semibold mb-1">工资计算公式：</p>
              <p className="bg-white border p-2 rounded text-sm text-gray-800">
                {calcFormula()} = {calcTotal().toFixed(2)}
              </p>
            </div>
            <button
              onClick={confirmApply}
              className="bg-green-600 text-white px-4 py-2 rounded mt-3"
            >
              确认该申请
            </button>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto bg-white shadow-lg p-4 rounded">
        <button onClick={exportExcel} className="bg-purple-600 text-white px-4 py-2 rounded">
          导出已确认工资Excel
        </button>
      </div>
    </div>
  );
}

/* ================================
   员工端
 ================================ */
function EmployeePage() {
  const [employeeList, setEmployeeList] = useState([]);
  const [formDataMap, setFormDataMap] = useState({});

  // 员工仅工号+姓名
  const [loginInfo, setLoginInfo] = useState({ empId: '', name: '' });
  const [loggedInEmp, setLoggedInEmp] = useState(null);

  // 默认月份
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const emp = localStorage.getItem(EMPLOYEE_LIST_KEY);
    const form = localStorage.getItem(FORM_DATA_KEY);
    setEmployeeList(emp ? JSON.parse(emp) : []);
    setFormDataMap(form ? JSON.parse(form) : {});
  }, []);

  const updateFormData = (key, data) => {
    const updated = { ...formDataMap, [key]: data };
    setFormDataMap(updated);
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(updated));
  };

  const handleLogin = () => {
    const match = employeeList.find(
      (e) => e.empId === loginInfo.empId && e.name === loginInfo.name
    );
    if (match) {
      setLoggedInEmp(match);
      localStorage.setItem('login_role', 'employee');
    } else {
      alert('该员工不存在，请先在老板娘端添加');
    }
  };

  if (!loggedInEmp) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow-xl w-full max-w-md">
          <h2 className="text-xl font-bold mb-4 text-center">员工登录</h2>
          <input
            placeholder="工号"
            className="border p-2 w-full mb-2 rounded"
            value={loginInfo.empId}
            onChange={(e) => setLoginInfo({ ...loginInfo, empId: e.target.value })}
          />
          <input
            placeholder="姓名"
            className="border p-2 w-full mb-4 rounded"
            value={loginInfo.name}
            onChange={(e) => setLoginInfo({ ...loginInfo, name: e.target.value })}
          />
          <div className="flex gap-4">
            <button
              onClick={handleLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
            >
              登录
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('login_role');
                window.location.reload();
              }}
              className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 员工端只填写: totalWorkdays, remoteHours, inquiryList, commissionList, travelDays
  // 不再填写 legalWorkdays
  // inquiryList/commissionList各自多条

  const formKey = `${loggedInEmp.empId}_${currentMonth}`;
  const existingForm = formDataMap[formKey] || {
    empId: loggedInEmp.empId,
    name: loggedInEmp.name,
    month: currentMonth,
    totalWorkdays: '',
    remoteHours: '',
    // 询盘
    inquiryList: [],
    // 提成
    commissionList: [],
    travelDays: '',
    status: '未提交',
  };

  const [localForm, setLocalForm] = useState(existingForm);

  useEffect(() => {
    setLocalForm(existingForm);
  }, [existingForm]);

  const isReadOnly = localForm.status === '已确认';

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLocalForm((prev) => ({ ...prev, [name]: value }));
  };

  // 添加一条询盘
  const addInquiry = () => {
    const arr = [...localForm.inquiryList];
    arr.push({ name: '', count: '', note: '' });
    setLocalForm({ ...localForm, inquiryList: arr });
  };

  const updateInquiry = (idx, field, val) => {
    const arr = [...localForm.inquiryList];
    arr[idx][field] = val;
    setLocalForm({ ...localForm, inquiryList: arr });
  };

  // 添加一条提成
  const addCommission = () => {
    const arr = [...localForm.commissionList];
    arr.push({ name: '', count: '', note: '' });
    setLocalForm({ ...localForm, commissionList: arr });
  };

  const updateCommission = (idx, field, val) => {
    const arr = [...localForm.commissionList];
    arr[idx][field] = val;
    setLocalForm({ ...localForm, commissionList: arr });
  };

  const handleSave = () => {
    updateFormData(formKey, localForm);
    alert('保存草稿成功');
  };

  const handleSubmit = () => {
    const updated = { ...localForm, status: '已提交' };
    updateFormData(formKey, updated);
    setLocalForm(updated);
    alert('提交成功');
  };

  const handleRevoke = () => {
    const updated = { ...localForm, status: '未提交' };
    updateFormData(formKey, updated);
    setLocalForm(updated);
    alert('已撤回，可修改');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white shadow-lg p-6 rounded">
        <div className="flex justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">员工工资申请</h2>
            <p className="text-sm text-gray-600 mt-1">
              姓名：{loggedInEmp.name}（{loggedInEmp.empId}）
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('login_role');
              window.location.reload();
            }}
            className="text-sm text-blue-600 underline self-start"
          >
            返回首页
          </button>
        </div>

        <label className="block text-sm mb-2">
          当前月份：
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="border p-2 rounded ml-2"
            disabled={localForm.status === '已确认'}
          />
        </label>

        <div className="mb-4 bg-gray-50 p-4 rounded border">
          <h3 className="font-semibold mb-2">1. 基础信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="mb-4 bg-gray-50 p-4 rounded border">
          <h3 className="font-semibold mb-2">2. 询盘列表 (inquiryList)</h3>
          {localForm.inquiryList.map((inq, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <input
                placeholder="项目名称"
                value={inq.name}
                onChange={(e) => updateInquiry(idx, 'name', e.target.value)}
                className="border p-2 rounded"
                disabled={isReadOnly}
              />
              <input
                placeholder="数量"
                value={inq.count}
                onChange={(e) => updateInquiry(idx, 'count', e.target.value)}
                className="border p-2 rounded"
                disabled={isReadOnly}
              />
              <input
                placeholder="备注"
                value={inq.note}
                onChange={(e) => updateInquiry(idx, 'note', e.target.value)}
                className="border p-2 rounded"
                disabled={isReadOnly}
              />
            </div>
          ))}
          {!isReadOnly && localForm.status === '未提交' && (
            <button
              onClick={addInquiry}
              className="text-sm text-blue-600 underline mb-2"
            >
              + 添加询盘
            </button>
          )}
        </div>

        <div className="mb-4 bg-gray-50 p-4 rounded border">
          <h3 className="font-semibold mb-2">3. 提成列表 (commissionList)</h3>
          {localForm.commissionList.map((cm, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <input
                placeholder="提成项目名称"
                value={cm.name}
                onChange={(e) => updateCommission(idx, 'name', e.target.value)}
                className="border p-2 rounded"
                disabled={isReadOnly}
              />
              <input
                placeholder="数量"
                value={cm.count}
                onChange={(e) => updateCommission(idx, 'count', e.target.value)}
                className="border p-2 rounded"
                disabled={isReadOnly}
              />
              <input
                placeholder="备注"
                value={cm.note}
                onChange={(e) => updateCommission(idx, 'note', e.target.value)}
                className="border p-2 rounded"
                disabled={isReadOnly}
              />
            </div>
          ))}
          {!isReadOnly && localForm.status === '未提交' && (
            <button
              onClick={addCommission}
              className="text-sm text-blue-600 underline mb-2"
            >
              + 添加提成
            </button>
          )}
        </div>

        <div className="mb-4 bg-gray-50 p-4 rounded border">
          <h3 className="font-semibold mb-2">4. 出差</h3>
          <input
            name="travelDays"
            placeholder="出差天数"
            value={localForm.travelDays}
            onChange={handleFormChange}
            className="border p-2 rounded w-full"
            disabled={isReadOnly}
          />
        </div>

        <div className="flex gap-4 mt-4 items-center">
          {localForm.status === '未提交' && (
            <>
              <button
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                提交
              </button>
              <button
                onClick={handleSave}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                保存草稿
              </button>
            </>
          )}
          {localForm.status === '已提交' && (
            <button
              onClick={handleRevoke}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              撤回修改
            </button>
          )}

          <span className="text-gray-700 text-sm">状态：{localForm.status}</span>
        </div>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
