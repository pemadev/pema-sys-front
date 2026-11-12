import React, { useEffect, useState } from 'react';
import {
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
  Progress,
  Row,
  Spinner,
} from 'reactstrap';
import { useQuery } from '@tanstack/react-query';
import MaterialIcon from '@material/react-material-icon';
import { Link, useParams } from 'react-router-dom';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import useAxios from '../../hooks/useAxios';
import newDate from '../../utils/formatDate';
import useAuth from '../../hooks/useAuth';
import { alert } from '../../components/atoms/Toast';
import TooltipHover from '../../components/atoms/TooltipHover';
import IndoDate from '../../utils/IndoDate';
import rupiah from '../../utils/rupiah';
import { onAvatarError } from '../../utils/defaultAvatar';


const animatedComponents = makeAnimated();

const HCIS_URL = process.env.REACT_APP_HCIS_BE;

const remaininDays = (endDate) => {
  const todayDate = new Date();

  const todayToLocalString = todayDate.toLocaleString();

  const todayBad = todayToLocalString.split(',')[0];

  const day = todayBad.split('/')[1];
  const month = todayBad.split('/')[0];
  const year = todayBad.split('/')[2];

  const todayMerge = `${year}-${month}-${day}`;

  const today = new Date(todayMerge);

  const deadline = new Date(endDate);

  const diff = deadline.getTime() - today.getTime();

  const result = diff / (1000 * 3600 * 24);

  return result;
};

const OverviewTab = () => {
  const { auth } = useAuth();
  const { projectId } = useParams();
  const [history, setHistory] = useState();
  const [modal, setModal] = useState(false);
  const [newPic, setNewPic] = useState();
  const [listEmployee, setListEmploye] = useState();
  const [loading, setLoading] = useState(false);
  const [bst, setBst] = useState([]);
  const [activePhase, setActivePhase] = useState(undefined);
  const [selectedSchema, setSelectedSchema] = useState('');
  const [isBusiness, setIsBusiness] = useState();
  const [partnerOptions, setPartnerOptions] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(undefined);
  const [progress, setProgress] = useState(0);
  const [taskByStatus, setTaskByStatus] = useState({
    todo: 0,
    inprogress: 0,
    underReview: 0,
    done: 0,
  });
  const api = useAxios();

  const toggle = () => {
    setModal(!modal);
  };

  const { isLoading, error, data, refetch } = useQuery({
    queryKey: ['overview'],
    queryFn: () =>
      api.get(`api/project/${projectId}`).then((res) => {
        return res.data.data;
      }),
  });

  useEffect(() => {
    const todofFiltered = data?.task_by_active_user?.filter((task) => {
      return parseInt(task.status, 10) === 0 || parseInt(task.status, 10) === 4;
    });

    const inProgressfFiltered = data?.task_by_active_user?.filter((task) => {
      return parseInt(task.status, 10) === 1;
    });

    const doneFiltered = data?.task_by_active_user?.filter((task) => {
      return parseInt(task.status, 10) === 2 || parseInt(task.status, 10) === 3;
    });

    const underReviewFiltered = data?.task_by_active_user?.filter((task) => {
      return parseInt(task.status, 10) === 2;
    });

    setTaskByStatus({
      todo: todofFiltered?.length,
      inprogress: inProgressfFiltered?.length,
      underReview: underReviewFiltered?.length,
      done: doneFiltered?.length,
    });

    setActivePhase(data?.current_stage?.phase_id);
    if (data?.category === 'business') {
      setIsBusiness(true);
    } else {
      setIsBusiness(false);
    }

    async function fetchProgress() {
      await api
        .post('api/project/progress/collection', { ids: [projectId] })
        .then((res) => {
          setProgress(res.data.data[0]?.progress);
        })
        .catch((err) => console.log(err));
    }

    fetchProgress();
  }, [data]);

  const fetsHistory = async () => {
    await api
      .get(`api/project/${projectId}/history`)
      .then((res) => setHistory(res.data.data))
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    fetsHistory();
  }, [projectId]);

  useEffect(() => {
    async function fetchEmployees() {
      await api
        .get(`api/employe/assignment-list`)
        .then((res) => setListEmploye(res.data.data))
        .catch((err) => console.log(err));
    }

    fetchEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await api
      .post(
        `api/project/handover`,
        {
          project_id: projectId,
          new_pic: newPic.value,
          file: bst,
          // jika fase projek adalah planning
          schema: activePhase === 2 ? selectedSchema : '',
          partner: activePhase === 2 ? selectedPartner : '',
        },
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      )
      .then(() => {
        fetsHistory();
        alert('success', 'BAST is under review');
      })
      .catch((err) => console.log(err));
    setLoading(false);
    setModal(false);
  };

  const allTaskPermission = ['Manager', 'Director'];

  useEffect(() => {
    async function fetchPartnerOptions() {
      await api
        .get(`api/project/partner/options`)
        .then((res) => setPartnerOptions(res.data.data))
        .catch((err) => console.log(err));
    }
    fetchPartnerOptions();
  }, []);

  useEffect(() => {
    refetch();
  }, [projectId]);

  return (
    <>
      {isLoading ? (
        <Col lg="12">
          <Card>
            <CardBody>Loading...</CardBody>
          </Card>
        </Col>
      ) : error ? (
        'Soemthing went wrong.'
      ) : (
        <Row>
          <Col lg="8">
            <Card className="rounded-3 mb-3">
              <CardBody>
                <div>
                  <CardTitle tag="h5" className="text-dark fw-bold">
                    Description
                  </CardTitle>
                </div>
                <div className="ms-auto mt-3 mt-md-0">
                  {isBusiness ? data.current_stage?.desc : data?.goals}
                </div>
                <div className="d-flex justify-content-between mt-3">
                  <div className="d-flex flex-column">
                    <small className="text-muted">Level</small>
                    <span className="text-dark">{data.level_desc}</span>
                  </div>
                  <div className="d-flex flex-column col-4">
                    <small className="text-muted">Base</small>
                    <div className="d-flex">
                      <span className="wtext-dark">
                        {data?.base_description.trim().length > 25
                          ? `${data?.base_description.substring(0, 25)}...`
                          : data?.base_description}
                      </span>
                      <abbr title={data?.base_description}>
                        <i
                          className="me-2 bi-info-circle-fill"
                          style={{ fontSize: '14px', marginLeft: '4px' }}
                        ></i>
                      </abbr>
                    </div>
                  </div>
                  <div className="d-flex flex-column">
                    <small className="text-muted">Start date</small>
                    <span className="text-dark">
                      {IndoDate(data?.current_stage && data.current_stage?.start_date)}
                    </span>
                  </div>
                  <div className="d-flex flex-column">
                    <small className="text-muted">Deadline</small>
                    <span className="text-dark">
                      {IndoDate(data?.current_stage !== null && data.current_stage?.end_date)}
                    </span>
                  </div>
                </div>
                <div
                  className="d-flex justify-content-between bg-light align-items-end p-2 mt-3"
                  style={{ borderRadius: '8px' }}
                >
                  <div className="d-flex gap-3 align-items-center">
                    <img
                      src={`${HCIS_URL}employee/file?f=photo-profil&id=${data.pic_active.employe_id}`}
                      className="rounded-circle"
                      alt="avatar"
                      width="45"
                      height="45"
                      onError={onAvatarError}
                    />
                    <div className="d-flex flex-column">
                      <small className="text-muted">PIC</small>
                      <span className="text-dark fw-bold">{data.pic_active.first_name}</span>
                      {/* <small className="text-muted">Divisi Teknologi & Informasi</small> */}
                    </div>
                  </div>
                  <div className="d-flex gap-3">
                    <span className="badge text-info bg-light-info rounded-pill d-inline-block">
                      Est. Cost <span className="fw-bold">{rupiah(data.estimated_cost)}</span>
                    </span>
                    <span className="badge text-info bg-light-info rounded-pill d-inline-block">
                      Est. Income <span className="fw-bold">{rupiah(data.estimated_income)}</span>
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
            <Card className="rounded-3">
              <CardBody>
                <div>
                  <CardTitle tag="h5" className="text-dark fw-bold">
                    Project Histories
                  </CardTitle>
                </div>
                <div className="d-flex flex-column gap-2">
                  {!history
                    ? 'Loading...'
                    : history?.map((h) => (
                        <div
                          key={h.history_id}
                          className="col-md-12 d-flex justify-content-between align-items-center py-2 px-3"
                          style={{ backgroundColor: '#F3F2F2', borderRadius: '8px' }}
                        >
                          <div className="col-md-4 d-flex flex-column">
                            <span className="text-dark">{h.organization_name}</span>
                            <small>{h.history_desc}</small>
                            {auth?.user?.roles.find((role) => allTaskPermission.includes(role)) && (
                              <Link
                                to={`/projects/details/${projectId}?div=${h.organization_id}&to=activities`}
                                style={{ textDecoration: 'none' }}
                              >
                                See all task
                              </Link>
                            )}
                          </div>
                          <div className="col-md-2">
                            <span
                              className={`badge bg-light-${
                                h.status === 'handover' && h.active === 0
                                  ? 'danger text-danger'
                                  : h.status === 'handover'
                                  ? 'success text-success'
                                  : h.status === 'review'
                                  ? 'danger text-danger'
                                  : 'primary text-primary'
                              } rounded-pill d-inline-block fw-bold`}
                            >
                              {h.status === 'handover' && h.active === 0
                                ? 'waiting for approval'
                                : (h.status === 'handover' && h.active === 1) || h.active === 1
                                ? 'active'
                                : h.status}
                            </span>
                          </div>
                          <div className="col-md-3 d-flex flex-column">
                            <small>{newDate(h.created_at)}</small>
                          </div>
                          <div className="col-md-1 d-flex justify-content-end">
                            <img
                              id={`tooltip-${h.history_id}`}
                              src={`${HCIS_URL}employee/file?f=photo-profil&id=${h.employe_id}`}
                              className="rounded-circle"
                              alt="avatar"
                              width="35"
                              height="35"
                              onError={onAvatarError}
                            />
                            <TooltipHover title={h.first_name} id={h.history_id.toString()} />
                          </div>
                        </div>
                      ))}
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card className="rounded-3 mb-3">
              <CardBody>
                <CardTitle tag="h5" className="d-flex justify-content-between fw-bold">
                  Project Active
                  <span className="text-success fw-bold">{progress.toFixed()}%</span>
                </CardTitle>
                <Progress
                  className=""
                  color="success"
                  value={progress.toFixed()}
                  style={{ height: '15px' }}
                />
              </CardBody>
            </Card>
            <Card className="rounded-3">
              <CardBody>
                <div className="overall-process">
                  <div className="overall-child">
                    <div>
                      <h6 className="text-muted">Remaining days</h6>
                      <span className="text-danger">
                        {remaininDays(
                          data?.current_stage !== null && data.current_stage?.end_date,
                        ).toFixed()}
                      </span>
                    </div>
                    <MaterialIcon icon="timer"></MaterialIcon>
                  </div>
                  <div className="overall-child">
                    <div>
                      <h6 className="text-muted">Task Todo</h6>
                      <span>{taskByStatus?.todo}</span>
                    </div>
                    <MaterialIcon icon="schedule"></MaterialIcon>
                  </div>
                </div>
                <div className="overall-process">
                  <div className="overall-child">
                    <div>
                      <h6 className="text-muted">Task In Progress</h6>
                      <span>{taskByStatus?.inprogress}</span>
                    </div>
                    <MaterialIcon icon="play_circle_outline"></MaterialIcon>
                  </div>
                  <div className="overall-child">
                    <div>
                      <h6 className="text-muted">Task Done</h6>
                      <span>{taskByStatus?.done}</span>
                    </div>
                    <MaterialIcon icon="task_alt"></MaterialIcon>
                  </div>
                </div>
              </CardBody>
            </Card>
            {isBusiness &&
              auth.user.roles.includes('Manager') &&
              auth.user.employe_id === data?.pic_active?.employe_id && (
                <Card>
                  <Button
                    type="button"
                    color="info"
                    disabled={
                      progress !== 100 ||
                      taskByStatus?.underReview !== 0 ||
                      taskByStatus?.todo !== 0 ||
                      taskByStatus?.inprogress !== 0
                    }
                    outline
                    onClick={toggle.bind(null)}
                  >
                    Handover Project
                  </Button>
                </Card>
              )}
            {/* <Card>
          <CardBody>
            <CardTitle tag="h4">Recent Tasks</CardTitle>
            <div className="d-flex flex-column gap-2">
              <div className="d-flex align-items-center gap-3">
                <div className="act-list" />
                <div className="d-flex flex-column">
                  <span className="text-muted">Jaka joined the project</span>
                  <span className="text-muted" style={{ fontSize: '10px' }}>
                    1 day ago
                  </span>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                <div className="act-list" />
                <div className="d-flex flex-column">
                  <span className="text-dark">Doni comment on your task </span>
                  <span className="text-muted" style={{ fontSize: '10px' }}>
                    1 day ago
                  </span>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                <div className="act-list" />
                <div className="d-flex flex-column">
                  <span className="text-muted">Lexa uploaded the file</span>
                  <span className="text-muted" style={{ fontSize: '10px' }}>
                    2 day ago
                  </span>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                <div className="act-list" />
                <div className="d-flex flex-column">
                  <span className="text-dark">Charlie assign a new task to you</span>
                  <span className="text-muted" style={{ fontSize: '10px' }}>
                    2 day ago
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card> */}
          </Col>
          <Modal isOpen={modal} toggle={toggle.bind(null)} size="md" fade={false} centered>
            <ModalHeader toggle={toggle.bind(null)}>Handover Project</ModalHeader>
            <form onSubmit={handleSubmit}>
              <ModalBody>
                <FormGroup>
                  <Label>Option</Label>
                  <Input type="select" id="base_id" name="base_id" defaultValue="a">
                    <option value="a" disabled>
                      Select
                    </option>
                    <option value="">Hand Over</option>
                    <option value="">Done</option>
                  </Input>
                </FormGroup>
                {/* current stage is Planning */}
                {activePhase === 2 && (
                  <>
                    {data?.current_stage?.partner === null && (
                      <FormGroup>
                        <Label for="partner">Partner</Label>
                        <Input
                          type="select"
                          id="partner"
                          name="partner"
                          defaultValue="pa"
                          onChange={(e) => setSelectedPartner(e.target.value)}
                        >
                          <option disabled value="pa">
                            - Select -
                          </option>
                          {partnerOptions.length > 0 &&
                            partnerOptions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </Input>
                      </FormGroup>
                    )}
                    <FormGroup>
                      <Label>Schema</Label>
                      <Input
                        type="select"
                        id="base_id"
                        name="base_id"
                        defaultValue="a"
                        onChange={(e) => setSelectedSchema(e.target.value)}
                      >
                        <option value="a" disabled>
                          Select
                        </option>
                        <option value="jo">JO</option>
                        <option value="jv">JV</option>
                      </Input>
                    </FormGroup>
                  </>
                )}
                {/* current stage is Planning */}
                <FormGroup>
                  <Label>PIC</Label>
                  <Select
                    components={animatedComponents}
                    options={listEmployee}
                    onChange={(choice) => setNewPic(choice)}
                  />
                </FormGroup>
                <FormGroup>
                  <Label htmlFor="bst">BAST</Label>
                  <FormGroup>
                    <Input
                      type="file"
                      name="file"
                      id="bst"
                      onChange={(e) => setBst(e.target.files)}
                    />
                  </FormGroup>
                </FormGroup>
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" outline onClick={toggle.bind(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="info"
                  disabled={loading}
                  className="d-flex gap-1 align-items-center"
                >
                  {loading ? (
                    <>
                      <Spinner className="me-2" size="sm" color="light" />
                      Sending
                    </>
                  ) : (
                    <>
                      <MaterialIcon icon="send" style={{ fontSize: '20px' }} />
                      Send
                    </>
                  )}
                </Button>
              </ModalFooter>
            </form>
          </Modal>
        </Row>
      )}
    </>
  );
};

export default OverviewTab;
