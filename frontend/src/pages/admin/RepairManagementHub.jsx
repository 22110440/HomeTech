import { useState } from 'react';
import RepairPackagesManagement from './RepairPackagesManagement';
import RepairCategoriesManagement from './RepairCategoriesManagement';
import RepairSchedulesManagement from './RepairSchedulesManagement';

const tabStyle = {
  display: 'flex',
  gap: 10,
  marginBottom: 16,
  flexWrap: 'wrap'
};

const buttonStyle = (active) => ({
  border: '1px solid #fecdd3',
  background: active ? '#be123c' : '#fff1f2',
  color: active ? '#fff' : '#9f1239',
  borderRadius: 8,
  padding: '8px 12px',
  fontWeight: 700,
  cursor: 'pointer'
});

export default function RepairManagementHub() {
  const [tab, setTab] = useState('packages');

  return (
    <div>
      <div style={tabStyle}>
        <button type="button" style={buttonStyle(tab === 'packages')} onClick={() => setTab('packages')}>Quản lý gói sửa chữa</button>
        <button type="button" style={buttonStyle(tab === 'categories')} onClick={() => setTab('categories')}>Danh mục sửa chữa & điện thoại</button>
        <button type="button" style={buttonStyle(tab === 'schedules')} onClick={() => setTab('schedules')}>Lịch sửa chữa</button>
      </div>

      {tab === 'packages' && <RepairPackagesManagement />}
      {tab === 'categories' && <RepairCategoriesManagement />}
      {tab === 'schedules' && <RepairSchedulesManagement />}
    </div>
  );
}
