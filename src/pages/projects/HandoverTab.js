import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  Col,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
} from 'reactstrap';
import { Link, useParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useAxios from '../../hooks/useAxios';
import newDate from '../../utils/formatDate';
import { alert } from '../../components/atoms/Toast';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';

const HandoverTab = () => {
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newStage, setNewStage] = useState({});
  const { auth } = useAuth();
  const { projectId } = useParams();
  const api = useAxios();

  const toggle = () => {
    setModal(!modal);
  };

  const { isLoading, error, data, refetch, isRefetching } = useQuery({
    queryKey: ['handover'],
    queryFn: () =>
      api.get(`api/project/${auth?.user.employe_id}/${projectId}/handover`).then((res) => {
        return res.data.data;
      }),
  });

  const fileUrl = process.env.REACT_APP_BASEURL;

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    api
      .post(`api/project/${data?.history_id}/confirm`, newStage)
      .then((res) => {
        refetch();
        alert('success', res.data.message);
      })
      .catch((err) => {
        alert('error', err.response.data.error);
      });
    setModal(false);
    setLoading(false);
  };

  const handleChange = (e) => {
    setNewStage((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  useEffect(() => {
    refetch();
  }, [projectId]);

  return (
    <>
      <Col>
        {isLoading || isRefetching ? (
          <div className="d-flex justify-content-center">Loading...</div>
        ) : error ? (
          <div className="d-flex justify-content-center">
            Something went wrong <span className="material-icons">sentiment_very_dissatisfied</span>
          </div>
        ) : (
          data !== null && (
            <Card className="custom-card">
              <CardBody>
                <CardTitle tag="h4" className="d-flex justify-content-between">
                  <div className="d-flex gap-2">
                    <Badge color="light" className="text-dark">
                      Handover project
                    </Badge>
                  </div>
                  <span style={{ fontSize: '14px' }}>{newDate(data.created_at)}</span>
                </CardTitle>
                <div className="d-flex  justify-content-center">
                  <h5>
                    Handover of the project from <strong>{data.from_division}</strong> to{' '}
                    <strong>{data.to_division}</strong>
                  </h5>
                </div>
                <p></p>
                <span className="text-dark">BAST File:</span>
                <div className="">
                  <div className="d-flex gap-3">
                    <Link
                      className="file-link"
                      to={`${fileUrl}project/${data.file}`}
                      target="blank"
                    >
                      {data.file}
                    </Link>
                  </div>
                </div>
                <div
                  className="d-flex justify-content-between align-items-center mt-4 border  py-2 px-3"
                  style={{ borderRadius: '10px' }}
                >
                  <div className="d-flex gap-4">
                    <div className="d-flex gap-3 align-items-center">
                      <img
                        src={fotoKaryawan(data.old_pic_id)}
                        onError={onAvatarError}
                        className="rounded-circle"
                        alt="avatar"
                        width="45"
                        height="45"
                      />
                      <div className="d-flex flex-column">
                        <span className="text-dark fw-bold">{data.old_pic}</span>
                        <small className="text-muted">{data.from_division}</small>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      type="button"
                      size="md"
                      color="success"
                      outline
                      onClick={toggle.bind(null)}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )
        )}
      </Col>
      <Modal isOpen={modal} toggle={toggle.bind(null)} size="md" fade={false} centered>
        <ModalHeader toggle={toggle.bind(null)}>Confirmation</ModalHeader>
        <form onSubmit={handleConfirm}>
          <ModalBody>
            <div className="d-flex justify-content-center">
              <h6 className="fw-bold">
                Next stage:{' '}
                {data?.current_stage?.phase === 1
                  ? 'Planning'
                  : data?.current_stage?.phase === 2
                  ? 'Execution, Control & Monitoring'
                  : ''}
              </h6>
            </div>
            <FormGroup>
              <Label htmlFor="desc_stage">Description</Label>
              <Input
                type="textarea"
                name="desc_stage"
                id="desc_stage"
                placeholder="stage description here.."
                rows="3"
                onChange={handleChange}
              />
            </FormGroup>
            <Row>
              <Col md="6">
                <FormGroup>
                  <Label for="start_date">Start date</Label>
                  <Input type="date" id="start_date" name="start_date" onChange={handleChange} />
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup>
                  <Label for="end_date">End date</Label>
                  <Input type="date" id="end_date" name="end_date" onChange={handleChange} />
                </FormGroup>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" outline onClick={toggle.bind(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="success"
              disabled={loading}
              className="d-flex gap-1 align-items-center"
              // onClick={handleConfirm}
            >
              {loading ? (
                <>
                  <Spinner className="me-2" size="sm" color="light" />
                  Sending
                </>
              ) : (
                'Send'
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
};

export default HandoverTab;
