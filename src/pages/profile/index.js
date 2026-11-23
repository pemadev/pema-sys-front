import { Row, Col } from 'reactstrap';
import React from 'react';
import Timeline from './Timeline';
import ProfileCard from './ProfileCard';
import HalamanPro from '../../components/HalamanPro';

const index = () => {
  return (
    <HalamanPro judul="Profil" keterangan="Data diri dan aktivitas akun Anda">
      <Row>
        <Col lg="4">
          <ProfileCard />
        </Col>
        <Col lg="8">
          <Timeline />
        </Col>
      </Row>
    </HalamanPro>
  );
};

export default index;
