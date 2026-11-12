import MaterialIcon from '@material/react-material-icon';
import React, { Fragment, useEffect, useState } from 'react';
import { Badge, Spinner } from 'reactstrap';
import PropTypes from 'prop-types';
import TaskPopup from './TaskPopup';
import TaskForm from './TaskForm';
import ActionMenu from '../../components/actionMenu/ActionMenu';
import useAxios from '../../hooks/useAxios';
import useAuth from '../../hooks/useAuth';
import { alert } from '../../components/atoms/Toast';
import CircularPercentage from '../../components/atoms/circularPercentage/CircularPercentage';
import TooltipHover from '../../components/atoms/TooltipHover';
import IndoDate from '../../utils/IndoDate';
import isExpired from '../../utils/isExpired';
import TaskFormAddSub from './TaskFormAddSub';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';

// const result = (emId) =>
//   emId.filter(
//     (person, index) => index === emId.findIndex((other) => person.employe_id === other.employe_id),
//   );\

const addTargetAllowedRoles = ['Manager'];
const addActivityAllowedRoles = ['Supervisor', 'Manager', 'Staff'];
const addSubActivityAllowedRoles = ['Staff', 'Supervisor', 'Manager'];

const BoardTask = ({ directSupervisor, data, projectId, refetch, isMemberActive }) => {
  const { auth } = useAuth();
  const [modal, setModal] = useState(false);
  const [addSubtaskOpen, setAddSubtaskOpen] = useState(undefined);
  const [task, setTask] = useState(undefined);
  const [updating, setUpdating] = useState();
  const [taskIdActive, setTaskIdActive] = useState();
  const [status, setStatus] = useState();
  const [selectedActivityId, setSelectedActivityId] = useState(undefined);
  const [showAddSub, setShowAddSub] = useState(false);
  const [itemValue, setItemValue] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState();
  const [selectedSubId, setSelectedSubId] = useState();
  const [isChecking, setIsChecking] = useState(false);
  const [isDeletingSub, setIsDeletingSub] = useState(false);
  const [idTaskParams, setIdTaskParams] = useState(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [levelTaskClicked, setLevelTaskClicked] = useState('');
  const api = useAxios();

  const userRoles = auth?.user?.roles;
  const userId = auth?.user?.employe_id;

  const toggle = () => {
    setModal(!modal);
  };

  const openPopup = (selectedTask) => {
    setModal(true);
    setTask(selectedTask);
  };

  const type = 2;

  const handleTaskStatus = async (taskId, taskStatus) => {
    setTaskIdActive(taskId);
    setStatus(taskStatus);
    setUpdating(true);
    await api
      .put(`api/task/${taskId}/status`, {
        employe_id: auth.user.employe_id,
        status: taskStatus,
      })
      .then(() => {
        alert(
          taskStatus === 1 ? 'start' : taskStatus === 2 ? 'done' : 'success',
          `Task status has been changed to ${
            taskStatus === 0 ? 'To Do' : taskStatus === 1 ? 'In Progress' : 'Done'
          }`,
        );
      })
      .catch((err) => {
        alert('error', err.response.data.error);
      });
    refetch();
    setUpdating(false);
    setTaskIdActive();
    setStatus();
  };

  const handleShowAddSub = (l3) => {
    if (userRoles?.includes('Staff')) {
      const picIds = [];

      for (let index = 0; index < l3?.pics.length; index++) {
        picIds.push(l3.pics[index].employe_id.toString());
      }

      if (picIds.includes(directSupervisor) || picIds.includes(userId)) {
        setShowAddSub(true);
        setSelectedActivityId(l3.task_id);
      } else {
        alert('error', 'You are not allowed');
      }
    } else {
      setShowAddSub(true);
      setSelectedActivityId(l3.task_id);
    }
  };

  const handleCheck = async (checkedId, l3) => {
    setIsChecking(true);
    setSelectedParentId(l3.task_id);
    setSelectedSubId(checkedId);
    const subArr = JSON.parse(l3.sub);

    const updateArr = subArr.map((item) => {
      if (item.id === checkedId) {
        return { ...item, status: item.status === 'created' ? 'checked' : 'created' };
      }
      return item;
    });

    await api
      .patch(`api/task/${l3.task_id}/activity/update-sub`, { sub: updateArr })
      .then(() => {
        refetch();
      })
      .catch(() => alert('error', 'Something went wrong'));

    setSelectedSubId();
    setIsChecking(false);
  };

  const handleDeleteSub = async (selectedId, l3) => {
    setIsDeletingSub(true);
    setSelectedParentId(l3.task_id);
    setSelectedSubId(selectedId);

    const subArr = JSON.parse(l3.sub);

    const updateArr = subArr.filter((obj) => {
      return obj.id !== selectedId;
    });

    await api
      .patch(`api/task/${l3.task_id}/activity/update-sub`, { sub: updateArr })
      .then(() => {
        refetch();
      })
      .catch(() => alert('error', 'Something went wrong'));

    setIsDeletingSub(false);
  };

  const duplicateFn = (tid) => {
    setIsDuplicating(true);
    setTimeout(() => {
      setIsDuplicating(false);
    }, 5000);
    console.log(tid);
  };

  // const queryParams = new URLSearchParams(window.location.search);
  // const idTaskParams = queryParams.get('task');

  const menuOptions = {
    options: [
      {
        id: 1,
        icon: <MaterialIcon icon="edit_note" />,
        type: 'button',
        label: 'To do',
        to: 0,
      },
      {
        id: 2,
        icon: <MaterialIcon icon="play_circle_outline" />,
        type: 'button',
        label: 'In Progress',
        to: 1,
      },
      {
        id: 3,
        icon: <MaterialIcon icon="task_alt" />,
        type: 'button',
        label: 'Done',
        to: 2,
      },
      {
        id: 4,
        icon: <MaterialIcon icon="content_copy" />,
        type: 'link',
        label: 'Duplicate',
        to: 'duplicate',
      },
    ],
  };

  const queryParams = new URLSearchParams(window.location.search);
  const params = queryParams.get('task');

  useEffect(() => {
    setIdTaskParams(params);
  }, [queryParams]);

  useEffect(() => {
    if (idTaskParams !== null) {
      const objDiv = document.getElementById(idTaskParams);
      if (objDiv !== null) {
        objDiv.scrollIntoView();
      }
    }
  }, [idTaskParams]);

  return (
    <>
      <div className="">
        {data?.map((td, i) => (
          <div key={td.task_id} className="board rounded-3">
            <div className="board-header">
              <div className="d-flex gap-2" style={{ height: 'max-content' }}>
                <Badge
                  color="info"
                  className={`bg-light-${
                    td.status === 0 ? 'primary' : td.status === 1 ? 'warning' : 'success'
                  } text-${
                    td.status === 0 ? 'primary' : td.status === 1 ? 'warning' : 'success'
                  } fw-bold`}
                >
                  #{i + 1}
                </Badge>
                {parseInt(td.status, 10) === 4 && (
                  <Badge color="danger">
                    <i className="bi-pencil-square mr-4" style={{ fontSize: '12px' }}></i>
                    &nbsp; Revision
                  </Badge>
                )}
              </div>
              {parseInt(td.status, 10) === 0 ||
              parseInt(td.status, 10) === 1 ||
              parseInt(td.status, 10) === 4 ? (
                updating && taskIdActive === td.task_id ? (
                  <div className="d-flex align-items-center gap-1">
                    <Spinner size="sm" color="success" />
                    <span style={{ fontSize: '12px' }}>
                      Updating status to{' '}
                      <strong>
                        {status === 0
                          ? 'To do'
                          : status === 1
                          ? 'In Progress'
                          : status === 2
                          ? 'Done'
                          : ''}
                      </strong>
                    </span>
                  </div>
                ) : isDuplicating ? (
                  <div className="d-flex align-items-center gap-1">
                    <Spinner size="sm" color="success" />
                    <span style={{ fontSize: '12px' }}>Duplicating the task..</span>
                  </div>
                ) : (
                  <div className="d-flex gap-2">
                    <div className="">
                      {parseInt(td.status, 10) === 1 && (
                        <span style={{ fontSize: '12px' }}>
                          Progress{'  '}
                          <strong
                            style={{
                              fontSize: '14px',
                              color: td.task_progress === 100 ? '#4cc790' : '#21C1D6',
                            }}
                          >
                            {/* {td.task_progress.toFixed(td.task_progress !== 100 && 2)}% */}
                            {td.task_progress.toFixed()}%
                          </strong>
                        </span>
                        // <div className="progress-bar">
                        //   <Progress
                        //     className="mb-0"
                        //     value={td.task_progress}
                        //     color="success"
                        //     style={{ fontSize: '10px', height: '12px' }}
                        //   />
                        //   <div className={`num ${td.task_progress > 52 && 'white'}`}>
                        //     {td.task_progress}%
                        //   </div>
                        // </div>
                      )}
                    </div>
                    <div key={td.task_id}>
                      {/* {td.pics.map(
                        (pic) =>
                          pic.employe_id.toString() === auth?.user.employe_id && (
                            <ActionMenu
                              key={pic.id}
                              menuOptions={menuOptions}
                              taskId={td.task_id}
                              status={parseInt(td.status, 10)}
                              action={handleTaskStatus}
                              progress={td.task_progress}
                            />
                          ),
                      )} */}
                      {isMemberActive && (
                        <ActionMenu
                          menuOptions={menuOptions}
                          taskId={td.task_id}
                          status={parseInt(td.status, 10)}
                          action={handleTaskStatus}
                          progress={td.task_progress}
                          {...{ duplicateFn }}
                        />
                      )}
                    </div>
                  </div>
                )
              ) : parseInt(td.status, 10) === 2 ? (
                <Badge color="light" className="d-flex text-dark">
                  <i className="bi-clock mr-4" style={{ fontSize: '12px' }}></i>
                  &nbsp; Waiting for approval
                </Badge>
              ) : parseInt(td.status, 10) === 3 ? (
                <Badge color="success" className="d-flex">
                  <i className="bi-check2-circle mr-4" style={{ fontSize: '13px' }}></i>
                  &nbsp; Approved
                </Badge>
              ) : (
                ''
              )}
            </div>
            <div
              className={`board-body task ${
                params === td.task_id.toString() && 'bg-light-warning'
              }`}
            >
              <div
                className="task-title fw-bold"
                onClick={() => openPopup(td)}
                id={td.task_id.toString() === idTaskParams ? idTaskParams : ''}
              >
                {td.task_title}
              </div>
              <div className="task-bottom">
                <div className="task-info">
                  {/* <small className="text-muted">{td.level_2.length} Subtask</small> */}
                  {userRoles.find((role) => addTargetAllowedRoles?.includes(role)) &&
                    parseInt(td.status, 10) !== 2 &&
                    parseInt(td.status, 10) !== 3 && (
                      <button
                        type="button"
                        className="add-child"
                        onClick={() => setAddSubtaskOpen(td.task_id)}
                      >
                        <MaterialIcon icon="add_circle" />
                      </button>
                    )}
                </div>
                <div className="task-action">
                  <div className="comment">
                    <MaterialIcon icon="comment" />
                    <div>{td.comments}</div>
                  </div>
                </div>
              </div>
              {addSubtaskOpen === td.task_id && (
                <div className="p-1">
                  <TaskForm
                    {...{ projectId, setAddSubtaskOpen, refetch, type }}
                    title="Add new target.."
                    taskId={td.task_id}
                    name="all"
                  />
                </div>
              )}
            </div>
            {td.level_2?.length > 0 &&
              td.level_2.map((l2) => (
                // <div key={l2.task_id} className="board-body subtask" onClick={() => openPopup(st)}>
                <div key={l2.task_id} className="board-container">
                  <div
                    key={l2.task_id}
                    className={`board-body subtask ${
                      params === l2.task_id.toString() && 'bg-light-warning'
                    }`}
                  >
                    {/* <div className="task-title" onClick={() => openPopup(l2)}> */}
                    <div
                      className="task-title"
                      onClick={() => {
                        openPopup(l2);
                        setLevelTaskClicked('activity');
                      }}
                      id={l2.task_id.toString() === idTaskParams ? idTaskParams : ''}
                    >
                      {l2.task_title}
                    </div>
                    <div className="task-bottom">
                      <div className="task-info">
                        {/* <small className="text-muted">{td.level_2.length} Subtask</small> */}
                        {userRoles.find((role) => addActivityAllowedRoles?.includes(role)) &&
                          parseInt(td.status, 10) !== 2 &&
                          parseInt(td.status, 10) !== 3 && (
                            <button
                              type="button"
                              className="add-child"
                              onClick={() => setAddSubtaskOpen(l2.task_id)}
                              disabled
                              style={{ display: 'none' }}
                            >
                              <MaterialIcon icon="add_circle" />
                            </button>
                          )}
                      </div>
                      <div className="task-action">
                        <div className="circular-progress">
                          <CircularPercentage data={parseInt(l2.task_progress.toFixed(), 10)} />
                        </div>
                        <div className="comment">
                          <MaterialIcon icon="comment" />
                          <div>{l2.comments}</div>
                        </div>
                      </div>
                    </div>
                    {addSubtaskOpen === l2.task_id && (
                      <div className="p-1">
                        <TaskForm
                          {...{ projectId, setAddSubtaskOpen, refetch, type }}
                          title="Add new activity.."
                          taskId={l2.task_id}
                          name="activity"
                        />
                      </div>
                    )}
                  </div>
                  {l2.level_3?.length > 0 &&
                    l2.level_3.map((l3) => (
                      <div
                        key={l3.task_id}
                        className={`board-body subtask-level3 ${
                          params === l3.task_id.toString() && 'bg-light-warning'
                        }`}
                      >
                        <div
                          className="task-title"
                          onClick={() => {
                            openPopup(l3);
                            setLevelTaskClicked('activity');
                          }}
                        >
                          {l3.task_title}
                        </div>
                        <div className="task-bottom">
                          <div className="task-info">
                            <span className="text-muted">
                              {l3.sub !== null ? JSON.parse(l3.sub).length : 0} Sub
                            </span>
                            {userRoles.find((role) => addSubActivityAllowedRoles?.includes(role)) &&
                              l3.task_id !== selectedActivityId &&
                              parseInt(td.status, 10) !== 2 &&
                              parseInt(td.status, 10) !== 3 && (
                                <button
                                  type="button"
                                  className="add-child"
                                  onClick={() => handleShowAddSub(l3)}
                                >
                                  <MaterialIcon icon="add" />
                                </button>
                              )}
                          </div>
                          <div className="task-action">
                            <div className="circular-progress">
                              <CircularPercentage data={parseInt(l3.task_progress.toFixed(), 10)} />
                            </div>
                            <div className="comment">
                              <MaterialIcon icon="comment" />
                              <div>{l3.comments}</div>
                            </div>
                          </div>
                        </div>
                        {showAddSub && (
                          <div className="add-item">
                            {isAddingItem && selectedActivityId === l3.task_id ? (
                              <div className="saving">
                                <Spinner size="sm" color="success" />
                                <span>Saving..</span>
                              </div>
                            ) : (
                              selectedActivityId === l3.task_id && (
                                <TaskFormAddSub
                                  {...{
                                    itemValue,
                                    setIsAddingItem,
                                    setShowAddSub,
                                    selectedActivityId,
                                    setSelectedActivityId,
                                    setItemValue,
                                    refetch,
                                  }}
                                />
                              )
                            )}
                          </div>
                        )}
                        {l3.sub !== null && (
                          <div className="sub-list">
                            {JSON.parse(l3.sub)?.map((item) => (
                              <div className="sub-item" key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => handleCheck(item.id, l3)}
                                  disabled={item.employe_id !== userId}
                                >
                                  <div
                                    className={`item-title ${
                                      isChecking &&
                                      item.id === selectedSubId &&
                                      l3.task_id === selectedParentId &&
                                      'checking'
                                    }`}
                                  >
                                    <div
                                      className={`title-check ${
                                        isChecking && item.id !== selectedSubId && 'not-allowed'
                                      }`}
                                    >
                                      {isChecking &&
                                        item.id === selectedSubId &&
                                        l3.task_id === selectedParentId && (
                                          <Spinner size="sm" color="primary" />
                                        )}
                                      {item.status === 'checked' && selectedSubId !== item.id && (
                                        <MaterialIcon icon="done" />
                                      )}
                                    </div>
                                    <div className="title-text">
                                      <span>
                                        {item.status === 'checked' ? <s>{item.sub}</s> : item.sub}{' '}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                                <div className="item-action">
                                  {/* {item.employe_id === userId && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedActivityId(item.id);
                                        setTaskIdActive(l3.task_id);
                                      }}
                                    >
                                      {uploadingFile && item.id === selectedActivityId ? (
                                        <Spinner color="primary" size="sm" />
                                      ) : (
                                        <Label htmlFor="upload">
                                          <MaterialIcon icon="attach_file" />
                                        </Label>
                                      )}
                                      <input
                                        type="file"
                                        id="upload"
                                        hidden
                                        onChange={(e) => handleUploadSubActvity(e.target.files)}
                                      />
                                    </button>
                                  )}
                                  <div>
                                    <MaterialIcon icon="download" />
                                  </div> */}
                                  {item.employe_id === userId && (
                                    <button
                                      type="button"
                                      className="delete"
                                      onClick={() => handleDeleteSub(item.id, l3)}
                                    >
                                      {isDeletingSub &&
                                      item.id === selectedSubId &&
                                      l3.task_id === selectedParentId ? (
                                        <Spinner size="sm" color="danger" />
                                      ) : (
                                        <MaterialIcon icon="delete" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            {parseInt(td.status, 10) !== 3 && (
              <div className="board-footer">
                <>
                  <div className="d-flex gap-2">
                    <MaterialIcon icon="event" style={{ fontSize: '20px' }} />
                    <span
                      className={`${isExpired(td.end_date) ? 'text-danger' : ''} `}
                      style={{ fontSize: '12px' }}
                    >
                      {IndoDate(td.end_date)}
                    </span>
                  </div>
                  <div className="members">
                    <div className="members-item">
                      {td?.pics?.map(
                        (pic, idx) =>
                          idx < 2 && (
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
                              <TooltipHover title={pic.first_name} id={pic.id.toString()} />
                            </Fragment>
                          ),
                      )}
                      {td?.pics?.length > 2 && (
                        <div className="member-plus bg-light-info text-info fw-bold">
                          +{td.pics.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              </div>
            )}
          </div>
        ))}
      </div>
      {modal && (
        <TaskPopup {...{ modal, setModal, toggle, task, refetch }} name={levelTaskClicked} />
      )}
    </>
  );
};

BoardTask.propTypes = {
  directSupervisor: PropTypes.string,
  data: PropTypes.array,
  projectId: PropTypes.string,
  refetch: PropTypes.func,
  isRefetching: PropTypes.any,
  isMemberActive: PropTypes.bool,
};

export default BoardTask;
