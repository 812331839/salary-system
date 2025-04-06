import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const EMPLOYEE_LIST_KEY = 'employee_list';
const FORM_DATA_KEY = 'salary_form_data_map';
const REVIEW_DATA_KEY = 'salary_review_data_map';

const App = () => {
  const [role, setRole] = useState('');
  const [bossAuth, setBossAuth] = useState(false);

  if (!role) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-4">请选择登录身份</h2>
        <div className="flex flex-col gap-4">
          <button onClick={() => setRole('employee')} className="bg-blue-600 text-white py-2 rounded">我是员工</button>
          <button onClick={() => {
            const input = prompt('请输入老板娘密码');
            if (input === '123456') {
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
  const [reviewDataMap, setReviewDataMap] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [newEmp, setNewEmp] = useState({ empId: '', name: '', password: '' });

  useEffect(() => {
    const emp = localStorage.getItem(EMPLOYEE_LIST_KEY);
    const form = localStorage.getItem(FORM_DATA_KEY);
    const review = localStorage.getItem(REVIEW_DATA_KEY);
    setEmployeeList(emp ? JSON.parse(emp) : []);
    setFormDataMap(form ? JSON.parse(form) : {});
    setReviewDataMap(review ? JSON.parse(review) : {});
  }, []);

  const handleAdd = () => {
    if (!newEmp.empId || !newEmp.name || !newEmp.password) return alert('请填写完整信息');
    const updated = [...employeeList, newEmp];
    setEmployeeList(updated);
    localStorage.setItem(EMPLOYEE_LIST_KEY, JSON.stringify(updated));
    setNewEmp({ empId: '', name: '', password: '' });
  };

  const filteredForms = Object.values(formDataMap).filter(
    (form) => form.month === selectedMonth && form.status === '已确认'
  );

  const totalPayroll = filteredForms.reduce((sum, f) => {
    const base = (6000 / Number(f.legalWorkdays || 1)) * Number(f.totalWorkdays || 0);
    const full = Number(f.totalWorkdays) === Number(f.legalWorkdays) ? 100 : 0;
    const remote = Number(f.remoteHours || 0) * 30;
    const review = reviewDataMap[f.empId + '_' + f.month] || {};
    const inquiry = Number(f.inquiryCount || 0) * Number(review.inquiryUnitPrice || 0);
    const travel = Number(f.travelDays || 0) * Number(review.travelBonusPerDay || 0);
    const commission = review.commissionApproved ? 300 : 0;
    const extra = Number(review.extraBonus || 0);
    const total = base + full + remote + inquiry + travel + commission + extra;
    return sum + total;
  }, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">老板娘工资审核与员工信息管理</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">添加员工</h3>
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

      <h3 className="text-lg font-semibold mb-2">工资统计（{selectedMonth}）</h3>
      <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border p-2 mb-4 rounded" />

      <table className="w-full text-sm border mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th>工号</th><th>姓名</th><th>基础</th><th>满勤</th><th>线上</th><th>询盘</th><th>出差</th><th>提成</th><th>额外</th><th>总计</th>
          </tr>
        </thead>
        <tbody>
          {filteredForms.map(f => {
            const base = (6000 / Number(f.legalWorkdays || 1)) * Number(f.totalWorkdays || 0);
            const full = Number(f.totalWorkdays) === Number(f.legalWorkdays) ? 100 : 0;
            const remote = Number(f.remoteHours || 0) * 30;
            const review = reviewDataMap[f.empId + '_' + f.month] || {};
            const inquiry = Number(f.inquiryCount || 0) * Number(review.inquiryUnitPrice || 0);
            const travel = Number(f.travelDays || 0) * Number(review.travelBonusPerDay || 0);
            const commission = review.commissionApproved ? 300 : 0;
            const extra = Number(review.extraBonus || 0);
            const total = base + full + remote + inquiry + travel + commission + extra;
            return (
              <tr key={f.empId + f.month} className="border-t">
                <td>{f.empId}</td><td>{f.name}</td><td>{base}</td><td>{full}</td><td>{remote}</td><td>{inquiry}</td>
                <td>{travel}</td><td>{commission}</td><td>{extra}</td>
                <td className="font-bold text-green-600">{total.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="font-semibold">总工资支出：¥ {totalPayroll.toFixed(2)}</div>
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

  const handleLogin = () => {
    const match = employeeList.find(
      e => e.empId === loginInfo.empId && e.name === loginInfo.name && e.password === loginInfo.password
    );
    if (match) setLoggedInEmp(match);
    else alert('未找到员工信息或密码错误');
  };

  const formKey = `${loggedInEmp?.empId}_${currentMonth}`;
  const formData = formDataMap[formKey] || {
    empId: loggedInEmp?.empId,
    name: loggedInEmp?.name,
    month: currentMonth,
    legalWorkdays: '',
    totalWorkdays: '',
    attendance: '',
    remoteHours: '',
    inquiryCount: '',
    inquiryDesc: '',
    commissionDesc: '',
    travelDays: '',
    status: '未提交',
  };

  const [localForm, setLocalForm] = useState(formData);

  const updateFormData = (newForm) => {
    const updated = { ...formDataMap, [formKey]: newForm };
    setFormDataMap(updated);
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(updated));
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setLocalForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const updated = { ...localForm, status: '已提交' };
    setLocalForm(updated);
    updateFormData(updated);
  };

  const handleSave = () => {
    updateFormData(localForm);
    alert('保存成功');
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">{loggedInEmp.name}（{loggedInEmp.empId}）工资申请</h2>
      <input value={currentMonth} onChange={e => setCurrentMonth(e.target.value)} type="month" className="border p-2 rounded mb-4" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="legalWorkdays" value={localForm.legalWorkdays} onChange={handleChange} placeholder="法定工作日" className="border p-2 rounded" disabled={localForm.status === '已确认'} />
        <input name="totalWorkdays" value={localForm.totalWorkdays} onChange={handleChange} placeholder="实际总工作日" className="border p-2 rounded" disabled={localForm.status === '已确认'} />
        <input name="attendance" value={localForm.attendance} onChange={handleChange} placeholder="出勤天数" className="border p-2 rounded" disabled={localForm.status === '已确认'} />
        <input name="remoteHours" value={localForm.remoteHours} onChange={handleChange} placeholder="线上小时" className="border p-2 rounded" disabled={localForm.status === '已确认'} />
        <input name="inquiryCount" value={localForm.inquiryCount} onChange={handleChange} placeholder="询盘数量" className="border p-2 rounded" disabled={localForm.status === '已确认'} />
        <input name="inquiryDesc" value={localForm.inquiryDesc} onChange={handleChange} placeholder="询盘说明" className="border p-2 rounded" disabled={localForm.status === '已确认'} />
        <input name="commissionDesc" value={localForm.commissionDesc} onChange={handleChange} placeholder="提成说明" className="border p-2 rounded" disabled={localForm.status === '已确认'} />
        <input name="travelDays" value={localForm.travelDays} onChange={handleChange} placeholder="出差天数" className="border p-2 rounded" disabled={localForm.status === '已确认'} />
      </div>

      <div className="mt-4 flex gap-4">
        {localForm.status !== '已确认' && <button onClick={handleSubmit} className="bg-green-600 text-white px-4 py-2 rounded">提交</button>}
        {localForm.status !== '已确认' && <button onClick={handleSave} className="bg-gray-600 text-white px-4 py-2 rounded">保存草稿</button>}
        <span className="text-sm text-gray-700 self-center">状态：{localForm.status}</span>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">历史工资记录</h3>
        <ul className="list-disc pl-6 text-sm">
          {Object.entries(formDataMap)
            .filter(([key]) => key.startsWith(loggedInEmp.empId))
            .map(([key, val]) => (
              <li key={key}>{val.month} - 状态：{val.status}</li>
            ))}
        </ul>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
