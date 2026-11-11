import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Col, Input, Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner, Table } from 'reactstrap';
import useAxios from '../../hooks/useAxios';

const pesanGalat = (err) => err?.response?.data?.message || 'Terjadi kesalahan, coba lagi.';

const RoleUser = () => {
  const api = useAxios();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [q, setQ] = useState('');
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pesan, setPesan] = useState(null);
  const [roleBaru, setRoleBaru] = useState('');
  const [ketBaru, setKetBaru] = useState('');
  const [edit, setEdit] = useState(null);
  const [pilih, setPilih] = useState([]);
  const [simpan, setSimpan] = useState(false);

  const muatRole = useCallback(() => {
    api
      .get('api/pengaturan/role')
      .then((res) => setRoles(res.data.data))
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const muatUser = useCallback(() => {
    setLoading(true);
    api
      .get('api/pengaturan/user', { params: { q: cari, page: halaman } })
      .then((res) => setUsers(res.data.data))
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }))
      .finally(() => setLoading(false));
  }, [cari, halaman]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    muatRole();
  }, [muatRole]);

  useEffect(() => {
    muatUser();
  }, [muatUser]);

  const tambahRole = (e) => {
    e.preventDefault();
    api
      .post('api/pengaturan/role', { nama: roleBaru, keterangan: ketBaru })
      .then((res) => {
        setRoles(res.data.data);
        setPesan({ warna: 'success', teks: `Role ${roleBaru} ditambahkan.` });
        setRoleBaru('');
        setKetBaru('');
      })
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }));
  };

  const bukaEdit = (u) => {
    setEdit(u);
    setPilih(u.roles || []);
  };

  const toggle = (nama) => setPilih((p) => (p.includes(nama) ? p.filter((x) => x !== nama) : [...p, nama]));

  const simpanRole = () => {
    setSimpan(true);
    api
      .put(`api/pengaturan/user/${edit.id}/role`, { roles: pilih })
      .then(() => {
        setPesan({ warna: 'success', teks: `Role ${edit.nama || edit.email} diperbarui. Berlaku penuh setelah yang bersangkutan login ulang.` });
        setEdit(null);
        muatUser();
        muatRole();
      })
      .catch((err) => setPesan({ warna: 'danger', teks: pesanGalat(err) }))
      .finally(() => setSimpan(false));
  };

  return (
    <>
      {pesan && (
        <Alert color={pesan.warna} toggle={() => setPesan(null)}>
          {pesan.teks}
        </Alert>
      )}

      <h6>Tambah role baru</h6>
      <form onSubmit={tambahRole}>
        <Row className="g-2 mb-1">
          <Col md={3}>
            <Input placeholder="Nama role, mis. PICGudang" value={roleBaru} onChange={(e) => setRoleBaru(e.target.value)} maxLength={40} required />
          </Col>
          <Col md={5}>
            <Input placeholder="Keterangan (opsional)" value={ketBaru} onChange={(e) => setKetBaru(e.target.value)} maxLength={255} />
          </Col>
          <Col md="auto">
            <Button color="primary" type="submit">
              Tambah
            </Button>
          </Col>
        </Row>
      </form>
      <div className="text-muted small mb-3">
        Tanpa spasi, huruf besar-kecil persis seperti yang dipakai di kode. Role baru baru berfungsi bila kodenya memeriksa nama role itu.
      </div>
      <div className="mb-4">
        {roles.map((r) => (
          <Badge key={r.nama} color="light" className="text-dark me-1 mb-1 border" title={r.keterangan || ''}>
            {r.nama} <span className="text-muted">({r.jumlah_user})</span>
          </Badge>
        ))}
      </div>

      <h6>Role per user</h6>
      <form
        className="d-flex gap-2 mb-2"
        onSubmit={(e) => {
          e.preventDefault();
          setHalaman(1);
          setCari(q);
        }}
      >
        <Input placeholder="Cari nama atau email" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <Button color="secondary" type="submit">
          Cari
        </Button>
      </form>
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <Table responsive size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.data.map((u) => (
              <tr key={u.id}>
                <td>{u.nama || '-'}</td>
                <td>{u.email}</td>
                <td>
                  {(u.roles || []).map((r) => (
                    <Badge key={r} color={r === 'SuperAdmin' ? 'danger' : 'info'} className="me-1">
                      {r}
                    </Badge>
                  ))}
                </td>
                <td className="text-end">
                  <Button size="sm" color="primary" outline onClick={() => bukaEdit(u)}>
                    Ubah role
                  </Button>
                </td>
              </tr>
            ))}
            {!users.data.length && (
              <tr>
                <td colSpan={4} className="text-center text-muted">
                  Tidak ada user.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
      <div className="d-flex align-items-center gap-2">
        <Button size="sm" disabled={halaman <= 1} onClick={() => setHalaman((h) => h - 1)}>
          Sebelumnya
        </Button>
        <span className="small">
          Halaman {users.current_page} dari {users.last_page} ({users.total} user)
        </span>
        <Button size="sm" disabled={halaman >= users.last_page} onClick={() => setHalaman((h) => h + 1)}>
          Berikutnya
        </Button>
      </div>

      <Modal isOpen={!!edit} toggle={() => setEdit(null)} scrollable>
        <ModalHeader toggle={() => setEdit(null)}>Role {edit?.nama || edit?.email}</ModalHeader>
        <ModalBody>
          {roles.map((r) => (
            <div key={r.nama} className="form-check">
              <input className="form-check-input" type="checkbox" id={`role-${r.nama}`} checked={pilih.includes(r.nama)} onChange={() => toggle(r.nama)} />
              <label className="form-check-label" htmlFor={`role-${r.nama}`}>
                {r.nama}
                {r.keterangan ? <span className="text-muted"> - {r.keterangan}</span> : null}
              </label>
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setEdit(null)}>
            Batal
          </Button>
          <Button color="primary" disabled={simpan} onClick={simpanRole}>
            {simpan ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default RoleUser;
