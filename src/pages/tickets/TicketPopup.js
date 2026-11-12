import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './Ticket.scss';
import { Button, Card, CardBody, Col, Input, Row, Spinner } from 'reactstrap';
import MaterialIcon from '@material/react-material-icon';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import useAxios from '../../hooks/useAxios';
import useAuth from '../../hooks/useAuth';
import IndoDate from '../../utils/IndoDate';
import { alert } from '../../components/atoms/Toast';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';

const TicketPopup = ({ ticket, isOpen, setIsOpen, refetch }) => {
  const { auth } = useAuth();
  const [assignedEmployee, setAssignedEmployee] = useState([]);
  const [listEmployee, setListEmploye] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState();
  const [status, setStatus] = useState();

  const animatedComponents = makeAnimated();

  const api = useAxios();

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('s-hide');
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    document.body.classList.remove('s-hide');
  };

  useEffect(() => {
    async function fetchEmployees() {
      await api
        .get(`api/employe/division-member/${auth?.user.employe_id}`)
        .then((res) => {
          setListEmploye(res.data.data);
        })
        .catch((err) => console.log(err));
    }

    fetchEmployees();
  }, []);

  const handleChangeStatus = async (val) => {
    setIsLoading(true);
    await api
      .patch(`api/ticket/${ticket?.id}`, { status: val })
      .then((res) => {
        setStatus(res.data.data.status);
        refetch();
        alert('success', 'Request status has been updated');
      })
      .catch((err) => console.log(err));
    setIsLoading(false);
  };

  const handleAssign = async () => {
    setIsAssigning(true);
    await api
      .post('api/ticket/assign-task', {
        employe_id: assignedEmployee.value,
        employe_name: assignedEmployee.label,
      })
      .then((res) => {
        alert('success', `Assignment has been sent to ${res.data.data.employe_name}`);
      })
      .catch((err) => console.log(err));
    setIsAssigning(false);
  };

  return (
    isOpen && (
      <div className="ticket-popup">
        <Col sm="10" md="10" lg="10">
          <Card className="card-cust rounded-3">
            <CardBody>
              <div className="d-flex justify-content-between">
                <h5 className="fw-bold">Ticket Info</h5>
                {isLoading ? (
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-info fw-bold">Loading..</span>
                  </div>
                ) : (
                  <MaterialIcon icon="close" onClick={handleClose} style={{ cursor: 'pointer' }} />
                )}
              </div>
              <Row>
                <Col lg="7" className="mb-3">
                  <Row className="justify-content-between align-items-center mb-3">
                    <Col md="8">
                      <span># {ticket?.ticket_number}</span>
                    </Col>
                    <Col md="4">
                      <Input
                        type="select"
                        defaultValue={status === ticket.status ? status : ticket.status}
                        onChange={(e) => handleChangeStatus(e.target.value)}
                      >
                        <option value="submitted" disabled={ticket.status === 'submitted'}>
                          Submitted
                        </option>
                        <option value="onprocess" disabled={ticket.status === 'onprocess'}>
                          Onprocess
                        </option>
                        <option value="pending" disabled={ticket.status === 'pending'}>
                          Pending
                        </option>
                        <option value="closed" disabled={ticket.status === 'closed'}>
                          Closed
                        </option>
                      </Input>
                    </Col>
                  </Row>
                  <Col>
                    <span className="fw-bold">{ticket?.title}</span>
                    <Row>
                      <small className="text-muted" style={{ fontSize: '12px' }}>
                        Created at <span className="text-dark">{IndoDate(ticket?.created_at)}</span>
                      </small>
                    </Row>
                    <p className="mt-3">{ticket?.desc}</p>
                    <Col>
                      <span>Attachments</span>
                      <div className="d-flex gap-3 mt-1">
                        <div className="file-container bg-light py-2 px-4 rounded-3">
                          <span>secreenshoot1.jpg </span>
                        </div>
                        <div className="file-container bg-light py-2 px-4 rounded-3">
                          <span>secreenshoot2.jpg </span>
                        </div>
                      </div>
                    </Col>
                  </Col>
                </Col>
                <Col lg="5">
                  <div
                    className="d-flex flex-column gap-3 rounded-3 p-3"
                    style={{ border: '1px dashed #7460EE' }}
                  >
                    <div className="d-flex flex-column gap-1">
                      <small>Requester</small>
                      <div className="d-flex gap-3 align-items-center">
                        <img
                          src={fotoKaryawan(ticket?.requester_id)}
                          onError={onAvatarError}
                          className="rounded-circle"
                          alt="avatar"
                          width="40"
                          height="40"
                        />
                        <div className="d-flex flex-column">
                          <span className="text-dark">{ticket?.requester}</span>
                          <small className="text-muted">{ticket?.requester_position}</small>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex flex-column gap-1">
                      <small>PIC</small>
                      <div className="d-flex gap-3 align-items-center">
                        <img
                          src={fotoKaryawan(ticket?.pic_id)}
                          onError={onAvatarError}
                          className="rounded-circle"
                          alt="avatar"
                          width="40"
                          height="40"
                        />
                        <div className="d-flex flex-column">
                          <span className="text-dark">{ticket?.pic}</span>
                          <small className="text-muted">{ticket?.pic_position}</small>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex flex-column gap-1 bg-light p-2 rounded-3">
                      {ticket.status === 'closed' || ticket.status === 'onprocess' ? (
                        <small>Assigned to:</small>
                      ) : (
                        <small>Assign to:</small>
                      )}
                      <div className="d-flex gap-2">
                        {ticket.status === 'submitted' || ticket.status === 'pending' ? (
                          <>
                            <div style={{ flex: '1' }}>
                              <Select
                                components={animatedComponents}
                                defaultValue={assignedEmployee}
                                options={listEmployee}
                                onChange={(choice) => setAssignedEmployee(choice)}
                              />
                            </div>
                            <Button
                              type="button"
                              color="info"
                              disabled={isAssigning}
                              onClick={handleAssign}
                            >
                              {isAssigning ? (
                                <div className="d-flex align-items-center gap-2">
                                  <Spinner size="sm" /> Sending..
                                </div>
                              ) : (
                                'Send'
                              )}
                            </Button>
                          </>
                        ) : (
                          'nama staff'
                        )}
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </div>
    )
  );
};

TicketPopup.propTypes = {
  isOpen: PropTypes.bool,
  setIsOpen: PropTypes.func,
  ticket: PropTypes.object,
  refetch: PropTypes.func,
};

export default TicketPopup;
