import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, Shield } from 'react-feather';
import ChangePassword from './ChangePassword';
import KelolaAkses from './KelolaAkses';
import './AkunSetting.scss';

const TAB = [
  { kunci: 'password', label: 'Change Password', ikon: Lock },
  { kunci: 'akses', label: 'Kelola Akses', ikon: Shield },
];

const AkunSetting = () => {
  const [params, setParams] = useSearchParams();
  const tab = TAB.some((t) => t.kunci === params.get('tab')) ? params.get('tab') : 'password';

  return (
    <div className="akun">
      <div className="akun-judul">
        <h4>Setting</h4>
        <p>Atur keamanan akun dan perangkat yang dapat mengakses akun Anda.</p>
      </div>

      <div className="akun-tab" role="tablist">
        {TAB.map((t) => {
          const Ikon = t.ikon;
          return (
            <button
              key={t.kunci}
              type="button"
              role="tab"
              aria-selected={tab === t.kunci}
              className={tab === t.kunci ? 'aktif' : ''}
              onClick={() => setParams({ tab: t.kunci }, { replace: true })}
            >
              <Ikon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'password' ? <ChangePassword /> : <KelolaAkses />}
    </div>
  );
};

export default AkunSetting;
