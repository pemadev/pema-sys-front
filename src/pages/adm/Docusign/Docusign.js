import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Table } from 'reactstrap';
import dayjs from 'dayjs';
import useAxios from '../../../hooks/useAxios';
import DocusignForm from './DocusignForm';

const STATUS = {
  pending: { color: 'warning', label: 'Menunggu' },
  completed: { color: 'success', label: 'Selesai' },
  cancelled: { color: 'secondary', label: 'Dibatalkan' },
};

const Docusign = () => {
  const api = useAxios();
  const [docs, setDocs] = useState([]);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    api.get('dapi/docusign').then((res) => setDocs(res.data.data)).catch(() => setDocs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn, okMsg) => {
    try {
      const res = await fn();
      setMsg({ color: 'success', text: okMsg || res.data.message });
      load();
    } catch (e) {
      setMsg({ color: 'danger', text: e.response?.data?.message || 'Terjadi kesalahan' });
    }
  };

  const download = async (doc, type) => {
    const res = await api.get(`dapi/docusign/detail/${doc.id}/file`, { params: { type }, responseType: 'blob' });
    window.open(URL.createObjectURL(res.data), '_blank');
  };

  if (creating) {
    return (
      <DocusignForm
        onCancel={() => setCreating(false)}
        onDone={(text) => {
          setCreating(false);
          setMsg({ color: 'success', text });
          load();
        }}
      />
    );
  }

  return (
    <>
      {msg && (
        <Alert color={msg.color} toggle={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}
      <div className="mb-2">
        <Button color="primary" onClick={() => setCreating(true)}>
          + Dokumen Baru
        </Button>
      </div>
      <Table responsive hover>
        <thead>
          <tr>
            <th>Judul</th>
            <th>Penanda tangan</th>
            <th>Status</th>
            <th>Dibuat</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td>{d.title}</td>
              <td>
                {d.signers.map((s) => (
                  <div key={s.id}>
                    {s.status === 'signed' ? '✅' : '⏳'} {d.sign_mode === 'sequential' && <b>{s.sign_order}. </b>}
                    {s.name} <small className="text-muted">({s.position} - {s.email})</small>
                    {s.status === 'pending' && d.status === 'pending' && (
                      <Button
                        size="sm"
                        color="link"
                        onClick={() => act(() => api.post(`dapi/docusign/detail/${d.id}/resend/${s.id}`))}
                      >
                        Kirim ulang
                      </Button>
                    )}
                  </div>
                ))}
              </td>
              <td>
                <Badge color={STATUS[d.status].color}>{STATUS[d.status].label}</Badge>
              </td>
              <td>{dayjs(d.created_at).format('DD-MM-YYYY HH:mm')}</td>
              <td className="text-nowrap">
                <Button size="sm" outline onClick={() => download(d, 'signed')}>
                  Lihat
                </Button>{' '}
                {d.status === 'pending' && (
                  <Button
                    size="sm"
                    color="danger"
                    outline
                    onClick={() => window.confirm('Batalkan dokumen ini?') && act(() => api.post(`dapi/docusign/detail/${d.id}/cancel`))}
                  >
                    Batalkan
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {!docs.length && (
            <tr>
              <td colSpan={5} className="text-center text-muted">
                Belum ada dokumen
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
};

export default Docusign;
