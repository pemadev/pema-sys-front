import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Col,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
} from 'reactstrap';
import { useQuery } from '@tanstack/react-query';
import MaterialIcon from '@material/react-material-icon';
import useAxios from '../../hooks/useAxios';
import useAuth from '../../hooks/useAuth';
import './Project.scss';
import EditProjectModal from './EditProjectModal';
import { alert } from '../../components/atoms/Toast';
import { onAvatarError } from '../../utils/defaultAvatar';


const allowedRolesForReview = ['Manager', 'Director'];
const allowedRolesForBastReview = ['Director'];

const HCIS_URL = process.env.REACT_APP_HCIS_BE;

const ProjectNav = ({ navActive, setNavActive, totalReview, totalBastReview }) => {
  const [currentTotalReview, setCurrentTotalReview] = useState('');
  const [currentTotalBastReview, setCurrentTotalBastReview] = useState(0);
  const { auth } = useAuth();
  const { roles } = auth.user;
  const api = useAxios();
  const { projectId } = useParams();
  const [actionMenu, setActionMenu] = useState(false);
  const [isBusiness, setIsBusiness] = useState();

  const [modal, setModal] = useState(false);
  const [modal2, setModal2] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  // const [actionMenu, setActionMenu] = useState(undefined);

  const toggle = () => {
    setModal(!modal);
  };

  const toggle2 = () => {
    setModal2(!modal2);
  };

  const queryParams = new URLSearchParams(window.location.search);

  const queryTo = queryParams.get('to');

  useEffect(() => {
    if (queryTo === 'review') {
      setNavActive(5);
    } else if (queryTo === 'handover') {
      setNavActive(6);
    } else if (queryTo === 'overview') {
      setNavActive(1);
    } else if (queryTo === 'activities') {
      setNavActive(7);
    } else if (queryTo === 'bast-review') {
      setNavActive(8);
    }
  }, [queryParams]);

  useEffect(() => {
    async function fetchTotalReview() {
      await api
        .get(`api/task/${projectId}/level1/review`)
        .then((res) => setCurrentTotalReview(res.data.data))
        .catch((err) => console.log(err));
    }
    if (roles?.find((role) => allowedRolesForReview.includes(role))) {
      fetchTotalReview();
    }
  }, [totalReview]);

  useEffect(() => {
    async function fetchTotalBastReview() {
      await api
        .get(`api/project/${projectId}/${auth?.user.employe_id}/bast/review`)
        .then((res) => {
          setCurrentTotalBastReview(res.data.data);
        })
        .catch((err) => console.log(err));
    }
    if (roles?.find((role) => allowedRolesForBastReview.includes(role))) {
      fetchTotalBastReview();
    }
  }, [totalBastReview]);

  const { isLoading, data, refetch } = useQuery({
    queryKey: ['project-number'],
    queryFn: () =>
      api.get(`api/project/${projectId}`).then((res) => {
        return res.data.data;
      }),
  });

  useEffect(() => {
    refetch();
  }, [projectId]);

  useEffect(() => {
    if (data?.category === 'business') {
      setIsBusiness(true);
    } else {
      setIsBusiness(false);
    }
  }, [data]);

  const handleUpdate = () => {
    setModal(true);
    setActionMenu(undefined);
  };

  const handleDelete = () => {
    setModal2(!modal2);
    setActionMenu(false);
  };

  const deleteProject = async () => {
    setIsDeleting(true);
    await api
      .delete(`api/project/${projectId}`)
      .then(() => {
        alert('success', 'Project has been deleted.');
        navigate('/projects');
      })
      .catch(() => {
        alert('error', 'Something went wrong.');
      });
    setModal2(!modal2);
    setIsDeleting(false);
  };

  const BoardAllowedRoles = ['Staff', 'Manager'];
  const MembersAllowedRoles = ['Staff', 'Manager', 'Director'];
  const ActivitiesAllowedRoles = ['Manager', 'Director'];
  const FilesAllowedRoles = ['Staff', 'Manager'];
  const BASTReviewAllowedRoles = ['Director'];
  const BASTAndReviewNotAllowedRoles = 'Presdir';
  const ReviewTaskAllowedRoles = ['Manager', 'Director'];
  const HandoverAllowedRoles = ['Manager'];

  return (
    <>
      <Col className="nav-container mb-3">
        <Row sm="12" lg="8" className="project-nav overflow-auto">
          <Link
            className={`${navActive === 1 && 'active'} text-muted fw-bold`}
            onClick={() => setNavActive(1)}
          >
            Overview
          </Link>
          {auth?.user?.roles.find((role) => BoardAllowedRoles.includes(role)) && (
            <Link
              className={`${navActive === 2 && 'active'} text-muted fw-bold`}
              onClick={() => setNavActive(2)}
            >
              Board
            </Link>
          )}
          {auth?.user?.roles.find((role) => ActivitiesAllowedRoles.includes(role)) && (
            <Link
              className={`${navActive === 7 && 'active'} text-muted fw-bold`}
              onClick={() => setNavActive(7)}
            >
              Activities
            </Link>
          )}
          {auth?.user?.roles.find((role) => FilesAllowedRoles.includes(role)) && (
            <>
              <Link
                className={`${navActive === 4 && 'active'} text-muted fw-bold`}
                onClick={() => setNavActive(4)}
              >
                Files
              </Link>
            </>
          )}
          {auth?.user?.roles.find((role) => BASTReviewAllowedRoles.includes(role)) &&
            !auth?.user?.roles.includes(BASTAndReviewNotAllowedRoles) && (
              <Link
                className={`${navActive === 8 && 'active'} text-muted fw-bold`}
                onClick={() => setNavActive(8)}
              >
                BAST Review{' '}
                <div
                  color="danger"
                  className={`count ${
                    currentTotalBastReview ? 'bg-danger text-white' : 'bg-light text-dark'
                  }`}
                >
                  {currentTotalBastReview?.length}
                </div>
              </Link>
            )}
          {auth?.user?.roles.find((role) => ReviewTaskAllowedRoles.includes(role)) && (
            <>
              <Link
                className={`${navActive === 5 && 'active'} text-muted fw-bold`}
                onClick={() => setNavActive(5)}
              >
                Review{' '}
                <div
                  color="danger"
                  className={`count ${
                    currentTotalReview?.length > 0 ? 'bg-danger text-white' : 'bg-light text-dark'
                  }`}
                >
                  {currentTotalReview?.length}
                </div>
              </Link>
            </>
          )}
          {auth?.user?.roles.find((role) => HandoverAllowedRoles.includes(role)) && (
            <Link
              className={`${navActive === 6 && 'active'} text-muted fw-bold`}
              onClick={() => setNavActive(6)}
            >
              Handover{' '}
            </Link>
          )}
          {auth?.user?.roles.find((role) => MembersAllowedRoles.includes(role)) && (
            <Link
              className={`${navActive === 3 && 'active'} text-muted fw-bold`}
              onClick={() => setNavActive(3)}
            >
              Members
            </Link>
          )}
        </Row>
        <Row
          sm="12"
          style={{
            fontSize: '20px',
            marginRight: '10px',
            textAlign: 'right',
            minWidth: '35%',
          }}
        >
          <span className="fw-bold">{isLoading ? 'Loading..' : data?.project_number}</span>
        </Row>
      </Col>
      <Card className="rounded-3 mb-3">
        <CardBody>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Row>
              <Col lg="8">
                <Row md="12">
                  <h5 className="fw-bold">{data?.project_name}</h5>
                </Row>
                {isBusiness ? (
                  <Row lg="12">
                    <Col sm="12 mb-2" md="4">
                      <div className="d-flex align-items-center gap-2">
                        <MaterialIcon
                          icon="manage_accounts"
                          className="text-muted"
                          style={{ fontSize: '28px' }}
                        />
                        <div className="d-flex flex-column">
                          <span
                            className="text-muted"
                            style={{ fontSize: '10px', marginBottom: '-4px' }}
                          >
                            Partner
                          </span>
                          <small className="fw-bold">
                            {data?.current_stage?.partner_name || '-'}
                          </small>
                        </div>
                      </div>
                    </Col>
                    <Col sm="12 mb-2" md="4">
                      <div className="d-flex align-items-center gap-2">
                        <MaterialIcon
                          icon="handshake"
                          className="text-muted"
                          style={{ fontSize: '28px' }}
                        />
                        <div className="d-flex flex-column">
                          <span
                            className="text-muted"
                            style={{ fontSize: '10px', marginBottom: '-4px' }}
                          >
                            Schema
                          </span>
                          <small className="fw-bold">
                            {data?.current_stage?.schema === 'jo'
                              ? 'Join Operational'
                              : data?.current_stage?.schema === 'jv'
                              ? 'Join Venture'
                              : '-'}
                          </small>
                        </div>
                      </div>
                    </Col>
                    <Col sm="12 mb-2" md="4">
                      <div className="d-flex align-items-center gap-2">
                        <MaterialIcon
                          icon="play_circle_outline"
                          className="text-muted"
                          style={{ fontSize: '28px' }}
                        />
                        <div className="d-flex flex-column">
                          <span
                            className="text-muted"
                            style={{ fontSize: '10px', marginBottom: '-4px' }}
                          >
                            Phase
                          </span>
                          <small className="fw-bold">{data?.current_stage?.phase}</small>
                        </div>
                      </div>
                    </Col>
                  </Row>
                ) : (
                  <Row lg="12">
                    <div className="d-flex align-items-center gap-2">
                      <MaterialIcon icon="work_off" style={{ fontSize: '18px' }} />
                      <small className="fw-bold">Non-business</small>
                    </div>
                  </Row>
                )}
              </Col>
              <Col lg="4" className="d-flex align-items-center justify-content-end">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="d-flex flex-column align-items-end"
                    style={{ marginLeft: '10px' }}
                  >
                    <small className="fw-bold">{data?.pic_active.first_name}</small>
                    <span className="fw-bold" style={{ fontSize: '14px' }}>
                      {data?.pic_active.organization_name}
                    </span>
                    {/* {data?.category === 'business' && (
                      <span className="badge text-primary bg-light-primary rounded-pill d-inline-block fw-bold">
                        <div className="d-flex justify-content-center gap-1 align-items-center">
                          <MaterialIcon icon="play_circle_outline" style={{ fontSize: '12px' }} />
                          {data?.current_stage??.phase}
                        </div>
                      </span>
                    )} */}
                  </div>
                  <img
                    src={`${HCIS_URL}employee/file?f=photo-profil&id=${data?.pic_active?.employe_id}`}
                    className="rounded-circle"
                    alt="avatar"
                    width="35"
                    height="35"
                    onError={onAvatarError}
                  />
                  {auth?.user.first_name === data?.created_by ? (
                    <div className="action-table">
                      <button
                        type="button"
                        className="btn d-flex"
                        onClick={() => setActionMenu(true)}
                      >
                        <MaterialIcon icon="more_vert" />
                      </button>
                      {actionMenu && (
                        <>
                          <div className="action-overlay" onClick={() => setActionMenu(false)} />
                          <div className="action-options">
                            <Link type="button" className="text-muted" onClick={handleUpdate}>
                              <MaterialIcon icon="update" />
                              Update
                            </Link>
                            <button
                              type="button"
                              className="text-muted fw-bold"
                              onClick={handleDelete}
                            >
                              <MaterialIcon icon="delete" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    ''
                  )}
                </div>
                <EditProjectModal {...{ modal, setModal, toggle, data, refetch }} />
                <Modal isOpen={modal2} toggle={toggle2.bind(null)} centered>
                  <ModalHeader toggle={toggle2.bind(null)}>Confirmation</ModalHeader>
                  <ModalBody>
                    <div className="d-flex flex-column align-items-center">
                      <h4>{data?.project_name}</h4>
                      Are you sure you want to delete this project?
                    </div>
                  </ModalBody>
                  <ModalFooter>
                    <Button color="danger" size="sm" onClick={deleteProject} disabled={isDeleting}>
                      {isDeleting ? 'Deleting..' : 'Yes'}
                    </Button>
                    <Button color="secondary" size="sm" outline onClick={toggle2.bind(null)}>
                      Cancel
                    </Button>
                  </ModalFooter>
                </Modal>
              </Col>
            </Row>
          )}
        </CardBody>
      </Card>
      {/* <Col lg="12">
        <Alert color="primary" className="rounded-3" style={{ fontSize: '14px' }}>
          <div className="d-flex justify-content-between">
            <div>
              <span>Ketentuan task terbaru, </span>
              <Link
                to="https://drive.google.com/file/d/1So2xTY9FZA8GgWkvIO7zzo8LltyloljZ/view?usp=sharing"
                target="blank"
                style={{ textDecoration: 'none' }}
              >
                Baca selengkapnya
              </Link>
            </div>
            <MaterialIcon icon="info" />
          </div>
        </Alert>
      </Col> */}
    </>
  );
};

ProjectNav.propTypes = {
  navActive: PropTypes.any,
  setNavActive: PropTypes.func,
  totalReview: PropTypes.number,
  totalBastReview: PropTypes.number,
};

export default ProjectNav;
