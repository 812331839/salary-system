// 完整修复：
// 1. 员工端提交后仍能查看已填信息（表单变只读）。
// 2. 老板娘端增加“刷新”按钮，手动加载最新提交。
// 3. 老板娘可看到已提交内容，员工端可查看自己填写的数据。

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const EMPLOYEE_LIST_KEY = 'employee_list';
const FORM_DATA_KEY = 'salary_form_data_map';

const App = () => {
  const [role, setRole] = useState(() => localStorage.getItem('login_role') || '');
  const [bossAuth, setBossAuth] = useState(false);

  useEffect(() => {
    // 若本地记录是 boss，就默认 bossAuth = true
    if (role === 'boss') {
      setBossAuth(true);
    }
  }, [role]);

  if (!role) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">请选择登录身份</h2>
        <div className="flex flex-col gap-4">
          <button onClick={() => {
            localStorage.setItem('login_role', 'employee');
            setRole('employee');
          }} className="bg-blue-600 text-white py-2 rounded">我是员工</button>

          <button onClick={() => {
            const input = prompt('请输入老板娘密码');
            if (input === '123456') {
              localStorage.setItem('login_role', 'boss');
              setBossAuth(true);
              setRole('boss');
            } else {
              alert('密码错误');
            }
          }} className="bg-green-600 text-white py-2 rounded">我是老板娘</button>
        </div>
      </div>
    );
  }

  if (role === 'boss' && bossAuth) return <BossDashboard />;
  if (role === 'employee') return <EmployeePage />;
  return null;
};

const BossDashboard = () => {
  const [employeeList, setEmployeeList] = useState([]);
  const [formDataMap, setFormDataMap] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [newEmp, setNewEmp] = useState({ empId: '', name: '', password: '' });

  const loadData = () => {
    const emp = localStorage.getItem(EMPLOYEE_LIST_KEY);
    const form = localStorage.getItem(FORM_DATA_KEY);
    setEmployeeList(emp ? JSON.parse(emp) : []);
    setFormDataMap(form ? JSON.parse(form) : {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = () => {
    if (!newEmp.empId || !newEmp.name || !newEmp.password) return alert('请填写完整信息');
    const updated = [...employeeList, newEmp];
    setEmployeeList(updated);
    localStorage.setItem(EMPLOYEE_LIST_KEY, JSON.stringify(updated));
    setNewEmp({ empId: '', name: '', password: '' });
  };

  // 筛选出已提交的数据
  const keys = Object.keys(formDataMap).filter(k => formDataMap[k].status === '已提交');
  const selected = selectedKey ? formDataMap[selectedKey] : null;

  const calcFormula = (data) => {
    if (!data) return '';
    // 简单拼接公式
    const base = `(${data.totalWorkdays}*6000/${data.legalWorkdays})`;
    const remote = `+ ${data.remoteHours}*30`;
    const projStr = data.projects?.map(p => `+ ${p.count}*${p.amount}`).join(' ') || '';
    const travel = `+ ${data.travelDays}*补贴`; // 补贴值暂未设
    return `${base} ${remote} ${projStr} ${travel}`;
  };

  const confirmApply = () => {
    if (!selectedKey) return;
    const updated = {
      ...formDataMap,
      [selectedKey]: {
        ...formDataMap[selectedKey],
        status: '已确认'
      }
    };
    setFormDataMap(updated);
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(updated));
    alert('已确认该申请');
    setSelectedKey(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">老板娘后台</h2>
        <div>
          <button
            onClick={() => {
              loadData();
            }}
            className="text-sm text-blue-600 underline mr-4"
          >刷新</button>
          <button
            onClick={() => {
              localStorage.removeItem('login_role');
              window.location.reload();
            }}
            className="text-sm text-blue-600 underline"
          >返回首页</button>
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-2">员工工资申请列表</h3>
      <ul className="list-disc pl-5 text-sm mb-4">
        {keys.length === 0 && <li className="text-gray-500">暂无已提交的申请</li>}
        {keys.map(k => (
          <li key={k} className="cursor-pointer text-blue-600" onClick={() => setSelectedKey(k)}>
            {k}（{formDataMap[k].name}）</li>
        ))}
      </ul>

      {selected && (
        <div className="bg-gray-50 p-4 border rounded">
          <h4 className="font-semibold mb-2">查看申请：{selected.name} - {selected.month}</h4>
          <p>法定工作日：{selected.legalWorkdays}</p>
          <p>线下工作日：{selected.totalWorkdays}</p>
          <p>线上小时数：{selected.remoteHours}</p>
          <p>出差天数：{selected.travelDays}</p>
          <div className="mt-2">
            <h5 className="font-semibold">提成项目：</h5>
            <ul className="list-disc pl-6 text-sm">
              {selected.projects?.map((p, i) => (
                <li key={i}>{p.name} × {p.count}，单价 {p.amount}，备注：{p.note}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <h5 className="font-semibold">工资计算公式：</h5>
            <p className="text-sm text-gray-800 bg-white border p-2 rounded mt-1">{calcFormula(selected)}</p>
          </div>
          <div className="mt-2">
            <button className="bg-green-600 text-white px-4 py-1 rounded mt-2" onClick={confirmApply}>确认该申请</button>
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold mt-8 mb-2">员工信息管理</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <input placeholder="工号" value={newEmp.empId} onChange={e => setNewEmp({ ...newEmp, empId: e.target.value })} className="border p-2 rounded" />
        <input placeholder="姓名" value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} className="border p-2 rounded" />
        <input placeholder="密码" value={newEmp.password} onChange={e => setNewEmp({ ...newEmp, password: e.target.value })} className="border p-2 rounded" />
      </div>
      <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded mb-4">添加员工</button>
      <ul className="text-sm list-disc pl-5">
        {employeeList.map(e => (
          <li key={e.empId}>{e.empId} - {e.name}</li>
        ))}
      </ul>
    </div>
  );
};

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

  // 更新 localStorage
  const updateFormData = (key, data) => {
    const updated = { ...formDataMap, [key]: data };
    setFormDataMap(updated);
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(updated));
  };

  const handleLogin = () => {
    const match = employeeList.find(e => e.empId === loginInfo.empId && e.name === loginInfo.name && e.password === loginInfo.password);
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
        <input placeholder="工号" className="border p-2 w-full mb-2" value={loginInfo.empId} onChange={e => setLoginInfo({ ...loginInfo, empId: e.target.value })} />
        <input placeholder="姓名" className="border p-2 w-full mb-2" value={loginInfo.name} onChange={e => setLoginInfo({ ...loginInfo, name: e.target.value })} />
        <input type="password" placeholder="密码" className="border p-2 w-full mb-4" value={loginInfo.password} onChange={e => setLoginInfo({ ...loginInfo, password: e.target.value })} />
        <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded w-full">登录</button>
      </div>
    );
  }

  // 生成表单 key = empId_month
  const formKey = `${loggedInEmp.empId}_${currentMonth}`;
  const myForm = formDataMap[formKey] || {
    empId: loggedInEmp.empId,
    name: loggedInEmp.name,
    month: currentMonth,
    legalWorkdays: '',
    totalWorkdays: '',
    remoteHours: '',
    projects: [],
    travelDays: '',
    status: '未提交',
  };

  const [localForm, setLocalForm] = useState(myForm);

  useEffect(() => {
    setLocalForm(myForm);
  }, [myForm]);

  const handleFormChange = e => {
    const {{ name, value }} = e.target;
    setLocalForm(prev => ({ ...prev, [name]: value }));
  };

  const addProject = () => {
    const projects = [...localForm.projects, { name: '', amount: '', note: '', count: '' }];
    setLocalForm({ ...localForm, projects });
  };

  const updateProject = (idx, field, val) => {
    const newProjects = [...localForm.projects];
    newProjects[idx][field] = val;
    setLocalForm({ ...localForm, projects: newProjects });
  };

  const handleSave = () => {
    updateFormData(formKey, localForm);
    alert('已保存草稿');
  };

  const handleSubmit = () => {
    const updated = { ...localForm, status: '已提交' };
    updateFormData(formKey, updated);
    setLocalForm(updated);
    alert('提交成功');
  };

  // 如果状态是已提交或已确认，就显示只读
  const isReadOnly = localForm.status !== '未提交';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">员工工资申请</h2>
      <div className="mb-2 flex justify-between">
        <div>
          <p>姓名：{loggedInEmp.name}（{loggedInEmp.empId}）</p>
          <p>月份：{currentMonth.replace('-', '年')}月</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('login_role');
            window.location.reload();
          }}
          className="text-sm text-blue-600 underline"
        >返回首页</button>
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
            value={localForm.legalWorkdays}
            onChange={handleFormChange}
            placeholder="法定工作日"
            className="border p-2 rounded"
            disabled={isReadOnly}
          />
          <input
            name="totalWorkdays"
            value={localForm.totalWorkdays}
            onChange={handleFormChange}
            placeholder="线下工作日"
            className="border p-2 rounded"
            disabled={isReadOnly}
          />
          <input
            name="remoteHours"
            value={localForm.remoteHours}
            onChange={handleFormChange}
            placeholder="线上小时数"
            className="border p-2 rounded"
            disabled={isReadOnly}
          />
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold mb-2">2. 项目提成与出差</h3>
        {localForm.projects.map((proj, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <input
              placeholder="项目名称"
              value={proj.name}
              onChange={e => updateProject(idx, 'name', e.target.value)}
              className="border p-2 rounded"
              disabled={isReadOnly}
            />
            <input
              placeholder="提成金额"
              value={proj.amount}
              onChange={e => updateProject(idx, 'amount', e.target.value)}
              className="border p-2 rounded"
              disabled={isReadOnly}
            />
            <input
              placeholder="项目数量"
              value={proj.count}
              onChange={e => updateProject(idx, 'count', e.target.value)}
              className="border p-2 rounded"
              disabled={isReadOnly}
            />
            <input
              placeholder="备注"
              value={proj.note}
              onChange={e => updateProject(idx, 'note', e.target.value)}
              className="border p-2 rounded"
              disabled={isReadOnly}
            />
          </div>
        ))}
        {!isReadOnly && (
          <button onClick={addProject} className="text-sm text-blue-600 mb-2">+ 添加新项目</button>
        )}
        <input
          name="travelDays"
          value={localForm.travelDays}
          onChange={handleFormChange}
          placeholder="出差天数"
          className="border p-2 rounded w-full"
          disabled={isReadOnly}
        />
      </div>

      <div className="mt-4 flex gap-4">
        {!isReadOnly && (
          <>
            <button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded">提交</button>
            <button onClick={handleSave} className="bg-gray-600 text-white px-4 py-2 rounded">保存</button>
          </>
        )}
        <span className="text-sm text-gray-700 self-center">状态：{localForm.status}</span>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
