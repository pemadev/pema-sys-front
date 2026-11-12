import React, { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Badge, Button, Card, CardBody, Col, Input, Progress, Row, Spinner } from 'reactstrap';
import MaterialIcon from '@material/react-material-icon';
import { PDFDownloadLink } from '@react-pdf/renderer';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import useAxios from '../../hooks/useAxios';
import TaskPopup from './TaskPopup';
import useAuth from '../../hooks/useAuth';
import { alert } from '../../components/atoms/Toast';
import PDFFile from './PDFFile';
import TooltipHover from '../../components/atoms/TooltipHover';
import './ProjectTable.scss';
import { level1Progress, level2Progress } from '../../utils/countTaskProgress';
import IndoDate from '../../utils/IndoDate';
import isExpired from '../../utils/isExpired';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';
// import TooltipHover from '../../components/atoms/TooltipHover';

// const result = (emId) =>
//   emId.filter(
//     (person, index) => index === emId.findIndex((other) => person.employe_id === other.employe_id),
//   );

const ActivityTab = () => {
  const { auth } = useAuth();
  const { projectId } = useParams();
  const [modal, setModal] = useState(false);
  const [task, setTask] = useState(undefined);
  const [taskIdSelected, setTaskIdSelected] = useState();
  const [addingFavorite, setAddingFavorite] = useState();
  const [isDirector, setIsDirector] = useState(false);
  const [projectTitle, setProjectTitle] = useState();
  const [filterSearch, setFilterSearch] = useState();
  const [progress, setProgress] = useState(0);
  const api = useAxios();

  const { search } = useLocation();

  const { isLoading, error, data, refetch } = useQuery({
    queryKey: ['act'],
    queryFn: () =>
      api.get(`api/task/${projectId}/activities/all${search}`).then((res) => {
        setProjectTitle(res.data.project);
        return res.data.data;
      }),
  });

  useEffect(() => {
    setFilterSearch(data);

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

  const toggle = () => {
    setModal(!modal);
  };

  const openPopup = (selectedTask) => {
    setModal(true);
    setTask(selectedTask);
  };

  const handleFavorite = async (taskId) => {
    setTaskIdSelected(taskId);
    setAddingFavorite(true);
    await api
      .post(`api/task/${auth?.user.employe_id}/${taskId}/favorite`)
      .then((res) => {
        refetch();
        alert('success', res.data.message);
      })
      .catch(() => {
        alert('error', 'Something went wrong.');
      });
    setTaskIdSelected();
    setAddingFavorite(false);
  };

  const favoriteAllowedRoles = ['Director'];
  const reportTaskAllowedRoles = ['Manager'];

  useEffect(() => {
    if (auth?.user.roles.find((role) => favoriteAllowedRoles.includes(role))) {
      setIsDirector(true);
    }
  }, [auth]);

  const handleSearch = (value) => {
    const filterByTitle = data.filter((item) =>
      item.task_title.toLowerCase().includes(value.toLowerCase()),
    );

    setFilterSearch(filterByTitle);
  };

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  useEffect(() => {
    refetch();
  }, [projectId]);

  return (
    <>
      <Col>
        <Card className="rounded-3">
          <CardBody>
            {isLoading ? (
              'loading...'
            ) : error ? (
              'Something went wrong.'
            ) : (
              <>
                <Row>
                  <Col sm="12 mb-2" md="6">
                    <div className="d-flex gap-2">
                      <Button
                        type="button"
                        className="d-flex align-items-center gap-2 rounded-3"
                        color="light"
                        size="sm"
                      >
                        <MaterialIcon icon="filter_list" style={{ fontSize: '12px' }} />
                        Sort
                      </Button>
                      <Button
                        type="button"
                        className="d-flex align-items-center gap-2 rounded-3"
                        color="light"
                        size="sm"
                      >
                        <MaterialIcon icon="tune" style={{ fontSize: '12px' }} />
                        Filters
                      </Button>
                    </div>
                  </Col>
                  <Col sm="12" md="6">
                    <div className="d-flex gap-3 col-md-6 w-100">
                      <div className="w-100 position-relative">
                        <Input
                          type="text"
                          className="rounded-3"
                          bsSize="md"
                          placeholder="Search task..."
                          onChange={(e) => handleSearch(e.target.value)}
                        />
                        <div className="position-absolute top-0 end-0 h-100 p-1">
                          <Button
                            type="button"
                            className="btn btn-light w-100 h-100 border-0 rounded-3 text-muted"
                            aria-describedby={id}
                            variant="contained"
                            onClick={handleClick}
                          >
                            <MaterialIcon icon="more_horiz" style={{ fontSize: '16px' }} />
                          </Button>
                          <Popover
                            id={id}
                            open={open}
                            anchorEl={anchorEl}
                            onClick={handleClose}
                            anchorOrigin={{
                              vertical: 'bottom',
                              horizontal: 'left',
                            }}
                            transformOrigin={{
                              vertical: 'top',
                              horizontal: 'center',
                            }}
                          >
                            <Typography sx={{ p: 2 }}>
                              <Col>
                                <Row>
                                  <Link to="#">Task</Link>
                                </Row>
                                <Row>
                                  <Link to="#">Employee</Link>
                                </Row>
                                <Row>
                                  <Link to="#">Date</Link>
                                </Row>
                              </Col>
                            </Typography>
                          </Popover>
                        </div>
                      </div>
                      {auth?.user.roles.find((role) => reportTaskAllowedRoles.includes(role)) && (
                        <PDFDownloadLink
                          document={<PDFFile {...{ projectTitle, data }} />}
                          fileName={`Task Report - ${projectTitle?.project_number} - ${projectTitle?.division}`}
                          style={{ textDecoration: 'none' }}
                        >
                          {/* {({ loading }) =>
                          loading ? (
                            <Button
                              type="button"
                              size="sm"
                              className="btn btn-light d-flex rounded-3"
                            >
                              Loading...
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="btn btn-light-info text-info d-flex align-items-center gap-2 rounded-3"
                            >
                              <MaterialIcon icon="picture_as_pdf" style={{ fontSize: '12px' }} />
                              Report
                            </Button>
                          )
                        } */}
                          <Button
                            type="button"
                            className="btn btn-light-info text-info rounded-3 d-flex py-2"
                            // size="lg"
                          >
                            <MaterialIcon icon="file_download" style={{ fontSize: '18px' }} />
                            {/* Report */}
                          </Button>
                        </PDFDownloadLink>
                      )}
                    </div>
                  </Col>
                </Row>
                <Col sm="12 overflow-auto">
                  <div className="d-flex align-items-center justify-content-between mt-2">
                    <h6 className="fw-bold">List of tasks from {projectTitle?.division}</h6>
                    <div className="w-25">
                      <div className="d-flex justify-content-between align-items-center">
                        <div style={{ width: '86%' }}>
                          <Progress
                            className=""
                            color="success"
                            value={progress.toFixed()}
                            style={{ height: '12px' }}
                          />
                        </div>
                        <span className="fw-bold">{progress.toFixed()}%</span>
                      </div>
                    </div>
                  </div>
                  <table className="rounded-corners act-table">
                    <thead>
                      <tr>
                        <th width="30">#</th>
                        <th colSpan="3" style={{ minWidth: '400px' }}>
                          Task title
                        </th>
                        <th width="">Status</th>
                        <th style={{ minWidth: '100px' }}>Start date</th>
                        <th style={{ minWidth: '100px' }}>Due date</th>
                        <th>Progress</th>
                        <th width="100">PIC</th>
                        {isDirector && <th width="50"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filterSearch?.length > 0 ? (
                        filterSearch?.map((ts, idx) => (
                          <Fragment key={ts.task_id}>
                            <tr>
                              <td>{idx + 1}.</td>
                              <td
                                colSpan="3"
                                style={{ cursor: 'pointer' }}
                                onClick={() => openPopup(ts)}
                              >
                                <span style={{ fontWeight: '600' }}>{ts.task_title}</span>
                                <br></br>
                                <Badge color="light" className="text-muted">
                                  {ts?.level_2?.length} subtask
                                </Badge>
                                {'  '}
                                <Badge color="light" className="text-muted">
                                  <MaterialIcon icon="comment" style={{ fontSize: '12px' }} />
                                  {ts.comments}
                                </Badge>
                              </td>

                              <td>
                                {ts.status === 0 ? (
                                  <Badge color="light" className="text-dark">
                                    To Do
                                  </Badge>
                                ) : ts.status === 1 ? (
                                  <Badge color="warning">In Progress</Badge>
                                ) : ts.status === 2 ? (
                                  <Badge color="light" className="text-dark">
                                    Under Review
                                  </Badge>
                                ) : ts.status === 3 ? (
                                  <Badge color="success">Approved</Badge>
                                ) : (
                                  <Badge color="danger">Revision</Badge>
                                )}
                              </td>
                              <td>{IndoDate(ts.start_date)}</td>
                              <td className={`${isExpired(ts.end_date) ? 'text-danger' : ''}`}>
                                {IndoDate(ts.end_date)}
                              </td>
                              <td>
                                <span className="badge bg-light-success text-primary rounded-pill d-inline-block fw-bold">
                                  {level1Progress(ts)?.toFixed()}%
                                </span>
                              </td>
                              <td>
                                <div className="members">
                                  <div className="members-item">
                                    {ts?.pics?.map(
                                      (pic, i) =>
                                        i < 2 && (
                                          <Fragment key={pic.id}>
                                            <img
                                              id={`tooltip-${pic.id}`}
                                              src={fotoKaryawan(pic.employe_id)}
 onError={onAvatarError}
                                              className="ava-pic rounded-circle"
                                              alt="avatar"
                                              width="35"
                                              height="35"
                                            />
                                            <TooltipHover
                                              title={pic.first_name}
                                              id={pic.id?.toString()}
                                            />
                                          </Fragment>
                                        ),
                                    )}
                                    {ts?.pics?.length > 2 && (
                                      <div className="member-plus bg-light-info text-info fw-bold">
                                        +{ts.pics.length - 2}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {isDirector && (
                                <td className="text-center">
                                  {addingFavorite && taskIdSelected === ts.task_id ? (
                                    <Spinner size="sm" color="warning" />
                                  ) : (
                                    <abbr title="Mark task" style={{ textDecoration: 'none' }}>
                                      <button
                                        type="button"
                                        className="fav-btn"
                                        onClick={() => handleFavorite(ts.task_id)}
                                      >
                                        <MaterialIcon
                                          icon="star"
                                          className={`${ts.isFavorite && 'is_favorite'}`}
                                        />
                                      </button>
                                    </abbr>
                                  )}
                                </td>
                              )}
                            </tr>
                            {ts.level_2?.length > 0 &&
                              ts.level_2?.map((st, si) => (
                                <Fragment key={st.task_id}>
                                  <tr key={st.task_id}>
                                    <td></td>
                                    <td width="5">
                                      {idx + 1}.{si + 1}
                                    </td>
                                    <td
                                      colSpan="2"
                                      onClick={() => openPopup(st)}
                                      style={{
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontWeight: '500',
                                      }}
                                    >
                                      {st.task_title}
                                      <br></br>
                                      <Badge color="light" className="text-muted">
                                        {st?.level_3?.length} subtask
                                      </Badge>
                                      {'  '}
                                      <Badge color="light" className="text-muted">
                                        <MaterialIcon icon="comment" style={{ fontSize: '12px' }} />
                                        {st.comments}
                                      </Badge>
                                    </td>
                                    <td>-</td>
                                    <td>{IndoDate(st.start_date)}</td>
                                    <td
                                      className={`${isExpired(st.end_date) ? 'text-danger' : ''}`}
                                    >
                                      {IndoDate(st.end_date)}
                                    </td>
                                    <td>
                                      <span className="badge bg-light-primary text-primary rounded-pill d-inline-block fw-bold">
                                        {level2Progress(st)?.toFixed()}%
                                      </span>
                                    </td>
                                    <td>
                                      <div className="members">
                                        <div className="members-item">
                                          {st?.pics?.map(
                                            (pic, i) =>
                                              i < 2 && (
                                                <Fragment key={pic.id}>
                                                  <img
                                                    id={`tooltip-${pic.id}`}
                                                    src={fotoKaryawan(pic.employe_id)}
 onError={onAvatarError}
                                                    className="ava-pic rounded-circle"
                                                    alt="avatar"
                                                    width="35"
                                                    height="35"
                                                  />
                                                  <TooltipHover
                                                    title={pic.first_name}
                                                    id={pic.id?.toString()}
                                                  />
                                                </Fragment>
                                              ),
                                          )}
                                          {st?.pics?.length > 2 && (
                                            <div className="member-plus bg-light-info text-info fw-bold">
                                              +{st.pics.length - 2}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    {isDirector && (
                                      <td className="text-center">
                                        {addingFavorite && taskIdSelected === st.task_id ? (
                                          <Spinner size="sm" color="warning" />
                                        ) : (
                                          <abbr
                                            title="Mark task"
                                            style={{ textDecoration: 'none' }}
                                          >
                                            <button
                                              type="button"
                                              className="fav-btn"
                                              onClick={() => handleFavorite(st.task_id)}
                                            >
                                              <MaterialIcon
                                                icon="star"
                                                className={`${st.isFavorite && 'is_favorite'}`}
                                              />
                                            </button>
                                          </abbr>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                  {st.level_3?.length > 0 &&
                                    st.level_3?.map((sst, ssi) => (
                                      <tr key={sst.task_id}>
                                        <td></td>
                                        <td></td>
                                        <td width="5">
                                          {idx + 1}.{si + 1}.{ssi + 1}
                                        </td>
                                        <td
                                          onClick={() => openPopup(sst)}
                                          style={{ cursor: 'pointer', textAlign: 'left' }}
                                        >
                                          {sst.task_title}
                                          <br></br>
                                          <Badge color="light" className="text-muted">
                                            <MaterialIcon
                                              icon="comment"
                                              style={{ fontSize: '12px' }}
                                            />
                                            {sst.comments}
                                          </Badge>
                                        </td>
                                        <td>-</td>
                                        <td>{IndoDate(sst.start_date)}</td>
                                        <td
                                          className={`${
                                            isExpired(sst.end_date) ? 'text-danger' : ''
                                          }`}
                                        >
                                          {IndoDate(sst.end_date)}
                                        </td>
                                        <td>
                                          <span className="badge bg-light-primary text-primary rounded-pill d-inline-block fw-bold">
                                            {sst?.task_progress?.toFixed()}%
                                          </span>
                                        </td>
                                        <td>
                                          <div className="members">
                                            <div className="members-item">
                                              {sst?.pics?.map(
                                                (pic, i) =>
                                                  i < 2 && (
                                                    <Fragment key={pic.id}>
                                                      <img
                                                        id={`tooltip-${pic.id}`}
                                                        src={fotoKaryawan(pic.employe_id)}
 onError={onAvatarError}
                                                        className="ava-pic rounded-circle"
                                                        alt="avatar"
                                                        width="35"
                                                        height="35"
                                                      />
                                                      <TooltipHover
                                                        title={pic.first_name}
                                                        id={pic.id?.toString()}
                                                      />
                                                    </Fragment>
                                                  ),
                                              )}
                                              {sst?.pics?.length > 2 && (
                                                <div className="member-plus bg-light-info text-info fw-bold">
                                                  +{sst.pics.length - 2}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                        {isDirector && (
                                          <td className="text-center">
                                            {addingFavorite && taskIdSelected === sst.task_id ? (
                                              <Spinner size="sm" color="warning" />
                                            ) : (
                                              <abbr
                                                title="Mark task"
                                                style={{ textDecoration: 'none' }}
                                              >
                                                <button
                                                  type="button"
                                                  className="fav-btn"
                                                  onClick={() => handleFavorite(sst.task_id)}
                                                >
                                                  <MaterialIcon
                                                    icon="star"
                                                    className={`${sst.isFavorite && 'is_favorite'}`}
                                                  />
                                                </button>
                                              </abbr>
                                            )}
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                </Fragment>
                              ))}
                          </Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" align="center">
                            No data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Col>
              </>
            )}
          </CardBody>
        </Card>
      </Col>
      {modal && <TaskPopup {...{ modal, setModal, toggle, task }} mode="activities" />}
    </>
  );
};

export default ActivityTab;
