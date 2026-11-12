import React, { Fragment, useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Form,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
} from 'reactstrap';
import PropTypes from 'prop-types';
import './TaskPopup.scss';
import MaterialIcon from '@material/react-material-icon';
import Select from 'react-select';
import makeAnimated from 'react-select/animated';
import { Link, useParams } from 'react-router-dom';
import ActionMenu from '../../components/actionMenu/ActionMenu';
import useAxios from '../../hooks/useAxios';
import newDate from '../../utils/formatDate';
import useAuth from '../../hooks/useAuth';
import TooltipHover from '../../components/atoms/TooltipHover';
import { alert } from '../../components/atoms/Toast';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';

// const result = (emId) =>
//   emId.filter(
//     (person, index) => index === emId.findIndex((other) => person.employe_id === other.employe_id),
//   );

// const sortByDate = (data) => data.sort(({ date: a }, { date: b }) => (a < b ? -1 : a > b ? 1 : 0));

const sortHistoryByDate = (data) => {
  return data?.sort((a, b) => a.created_at.localeCompare(b.created_at));
};

const TaskPopup = ({ modal, setModal, toggle, task, refetch, mode, name }) => {
  const { projectId } = useParams();
  const { auth } = useAuth();
  const [history, setHistory] = useState();
  const [loading, setLoading] = useState(false);
  const [taskTemp, setTaskTemp] = useState('');
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [listEmployee, setListEmploye] = useState();
  const [emModal, setEmModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState();
  const [postComment, setPostComment] = useState();
  const [commentSending, setCommentSending] = useState(false);
  const [files, setFiles] = useState([]);
  const [popContent, setPopContent] = useState();
  const [selectedFileId, setSelectedFileId] = useState();
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [listFile, setListFile] = useState([]);
  const [userIsPic, setUserIsPic] = useState(false);

  const inputCommentRef = useRef();

  const userRoles = auth?.user?.roles;
  const userId = auth?.user?.employe_id;

  const api = useAxios();

  const animatedComponents = makeAnimated();

  const assigneModal = () => {
    setEmModal(true);
  };

  useEffect(() => {
    setTaskTemp({
      approval_id: task?.approval_id,
      task_title: task?.task_title,
      task_desc: task?.task_desc,
      task_progress: task?.task_progress,
      start_date: task?.start_date,
      end_date: task?.end_date,
    });

    if (task?.pics) {
      setAssignedEmployees(
        task.pics.map((pic) => ({
          label: pic.first_name,
          value: pic.employe_id,
        })),
      );
    }

    async function fetchHistory() {
      await api.get(`api/task/history/${task?.task_id}`).then((res) => {
        setHistory(res.data.data);
      });
    }

    async function fetchComments() {
      await api.get(`api/comment/${task?.task_id}`).then((res) => setComments(res.data.data));
    }

    setListFile(task?.files);

    fetchComments();
    fetchHistory();

    setUserIsPic(!!task?.pics?.find((p) => p.employe_id.toString() === userId));
  }, [task]);

  useEffect(() => {
    async function fetchEmployees() {
      await api
        .get(`api/employe/assignment-list?search=${name}`)
        .then((res) => setListEmploye(res.data.data))
        .catch((err) => console.log(err));
    }
    if (!userRoles.includes('Staff')) {
      fetchEmployees();
    }
  }, []);

  useEffect(() => {
    setPopContent(history?.concat(comments));
  }, [history, comments]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    if (assignedEmployees.length !== 0) {
      taskTemp.pic = assignedEmployees;
      taskTemp.project_id = projectId;

      if (files) {
        taskTemp.files = files;
      }
      await api
        .patch(`api/task/${task?.task_id}`, taskTemp)
        .then(() => {
          alert('success', 'Task has been updated.');
          setModal(false);
          refetch();
        })
        .catch(() => alert('error', 'Something went wrong'));
    } else {
      alert('error', 'Field employee cannot be empty');
    }
    setUpdating(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files?.length === 0) {
      alert('error', 'Field cannot be empty');
    } else if (files[0]?.size > 10000000) {
      alert('error', 'Maximum file size is 10mb');
    } else {
      setUploading(true);
      await api
        .post(`api/task/${task.task_id}/upload`, files, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        .then((res) => {
          // eslint-disable-next-line no-unused-expressions
          task?.files?.push(res.data.file);
          // listFile.push(res.data.file);
          alert('success', 'File has been uploaded.');
        })
        .catch(() => {
          alert('error', 'Upload file failed');
        });
      setFiles([]);
      setUploading(false);
    }
  };

  const deleteTask = async () => {
    setLoading(true);
    await api
      .delete(`api/task/${task.task_id}`)
      .then(() => alert('success', 'Task has been deleted'))
      .catch(() => alert('error', 'Something went wrong'));
    setLoading(false);
    setModal(false);
    refetch();
  };

  const deleteFile = async (fileId) => {
    setIsDeletingFile(true);
    setSelectedFileId(fileId);
    await api
      .delete(`api/task/file/delete/${fileId}`)
      .then(() => {
        refetch();
        setModal(false);
        alert('success', 'A file has been deleted');
      })
      .catch('error', 'Delete file failed');
    setSelectedFileId();
    setIsDeletingFile(false);
  };

  const menuOptions = {
    taskId: task?.task_id,
    options: [
      {
        id: 1,
        type: 'delete',
        to: 'toDelete',
      },
    ],
  };

  const handleComment = async (e) => {
    e.preventDefault();
    setCommentSending(true);
    postComment.employe_id = auth.user.employe_id;
    postComment.task_id = task.task_id;
    await api
      .post(`api/comment`, postComment)
      .then((res) => setPopContent((current) => [...current, res.data.data]));
    setCommentSending(false);
    setPostComment();
    e.target.reset();
  };

  const fileUrl = process.env.REACT_APP_BASEURL;

  return (
    <>
      <Modal isOpen={modal} toggle={toggle.bind(null)} size="xl" fade={false} centered>
        <ModalHeader toggle={toggle.bind(null)}></ModalHeader>
        <ModalBody>
          {loading ? (
            <div className="d-flex justify-content-center" style={{ height: '400px' }}>
              Loading..
            </div>
          ) : (
            <div className="popup-body">
              <div className="left">
                {/* {auth?.user.employe_id !== task.employe_id.toString() || mode === 'activities' ? ( */}
                {mode === 'activities' ||
                task?.status === 2 ||
                task?.status === 3 ||
                (!userIsPic && task?.created_by !== auth?.user?.first_name) ? (
                  <>
                    <div className="top">
                      <div className="date">
                        <h6>Start Date </h6>
                        <span>{taskTemp?.start_date || '-'}</span>
                      </div>
                      <div className="date">
                        <h6>Due Date</h6>
                        <span>{taskTemp?.end_date || '-'}</span>
                      </div>
                    </div>
                    <div className="bottom mt-3">
                      <FormGroup>
                        <Label htmlFor="taskTitle">Task Title</Label>
                        <Input
                          type="text"
                          id="taskTitle"
                          name="taskTitle"
                          value={taskTemp?.task_title || ''}
                          readOnly
                          disabled
                        />
                      </FormGroup>
                      <FormGroup>
                        <Label htmlFor="taskDesc">Description</Label>
                        <Input
                          type="textarea"
                          id="taskDesc"
                          name="taskDesc"
                          value={taskTemp?.task_desc || ''}
                          readOnly
                          disabled
                        />
                      </FormGroup>
                      <FormGroup>
                        <span>PICs</span>
                        <br></br>
                        <div className="d-flex flex-column">
                          {assignedEmployees.map((em, i) => (
                            <div key={em.value} className="d-flex gap-3">
                              <span>{i + 1}.</span>
                              <span>{em.label}</span>
                            </div>
                          ))}
                        </div>
                      </FormGroup>
                    </div>
                    {userRoles.includes('Staff') || userRoles.includes('Supervisor') ? (
                      <>
                        <form onSubmit={handleUpload} className="mt-2">
                          <h6>Attachment files ({task?.files?.length || 0})</h6>
                          <div className="d-flex justify-content-between align-items-center bg-light px-2 rounded-3 mt-2">
                            <div className="d-flex align-items-center gap-1">
                              <div className="pt-2" id="tooltip-3">
                                <Label for="attach">
                                  <MaterialIcon icon="attach_file" className="btn-icon" />
                                </Label>
                                <input
                                  type="file"
                                  id="attach"
                                  name="attach"
                                  hidden
                                  onChange={(e) => setFiles(e.target.files)}
                                />
                                <TooltipHover title="Upload file" id="3" />
                              </div>
                              <span style={{ color: '#1F88E5', fontSize: '12px' }}>
                                {files[0] ? (
                                  files[0]?.name
                                ) : (
                                  <span style={{ color: '#68757C' }}>Max. 10mb</span>
                                )}
                              </span>
                            </div>
                            <Button
                              type="submit"
                              className="btn"
                              outline
                              size="sm"
                              disabled={task?.status === 3}
                            >
                              {uploading ? 'Uploading...' : 'Upload'}
                            </Button>
                          </div>
                        </form>
                        <div className="attach">
                          <ul>
                            {task?.files?.length > 0 &&
                              listFile.map(
                                (f) =>
                                  f.employe_id?.toString() === userId && (
                                    <div
                                      key={f.file_id}
                                      className="d-flex gap-1 align-items-center"
                                    >
                                      <li>
                                        <Link
                                          className="file-link"
                                          to={`${fileUrl}taskfiles/${f.file_name}`}
                                          target="_blank"
                                        >
                                          {f.file_name}
                                        </Link>
                                      </li>
                                      <button
                                        type="button"
                                        className="btn d-flex"
                                        style={{ color: '#EF6767' }}
                                        disabled={isDeletingFile}
                                        onClick={() => deleteFile(f.file_id)}
                                      >
                                        {isDeletingFile && selectedFileId === f.file_id ? (
                                          'Deleting..'
                                        ) : (
                                          <MaterialIcon
                                            icon="delete_outline"
                                            style={{ fontSize: '20px' }}
                                          />
                                        )}
                                      </button>
                                    </div>
                                  ),
                              )}
                          </ul>
                        </div>
                      </>
                    ) : (
                      <div className="attach">
                        <h6>Attachment files ({task?.files?.length || 0})</h6>
                        <ul>
                          {task?.files?.length > 0 &&
                            listFile.map((f) => (
                              <div key={f.file_id} className="d-flex gap-1 align-items-center">
                                <li>
                                  <Link
                                    className="file-link"
                                    to={`${fileUrl}taskfiles/${f.file_name}`}
                                    target="_blank"
                                  >
                                    {f.file_name}
                                  </Link>
                                </li>
                              </div>
                            ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <form onSubmit={handleUpdate}>
                      <div className="top">
                        <div className="date">
                          <h6>Start Date</h6>
                          <Input
                            type="date"
                            name="start_date"
                            value={taskTemp?.start_date || ''}
                            onChange={(e) =>
                              setTaskTemp({ ...taskTemp, start_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="date">
                          <h6>Due Date</h6>
                          <Input
                            type="date"
                            name="end_date"
                            value={taskTemp?.end_date || ''}
                            onChange={(e) => setTaskTemp({ ...taskTemp, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="bottom mt-3">
                        <Input
                          type="text"
                          name="task_title"
                          value={taskTemp?.task_title || ''}
                          onChange={(e) => setTaskTemp({ ...taskTemp, task_title: e.target.value })}
                        />
                        <Input
                          type="textarea"
                          cols="5"
                          rows="6"
                          name="task_desc"
                          value={taskTemp?.task_desc || ''}
                          onChange={(e) => setTaskTemp({ ...taskTemp, task_desc: e.target.value })}
                        />
                        {task?.child > 0 || task?.sub !== null
                          ? ''
                          : task?.pics?.map(
                              (pic) =>
                                pic.employe_id.toString() === auth?.user.employe_id && (
                                  <div
                                    className="d-flex gap-2 justify-content-between"
                                    key={pic.id}
                                  >
                                    <div className="col-sm-10">
                                      <Input
                                        type="range"
                                        defaultValue={task.task_progress}
                                        onChange={(e) =>
                                          setTaskTemp({
                                            ...taskTemp,
                                            task_progress: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="col-sm-1 d-flex justify-content-end">
                                      {taskTemp?.task_progress}%
                                    </div>
                                  </div>
                                ),
                            )}
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <div className="d-flex align-items-center gap-3">
                          <button type="button" className="btn-assigne" onClick={assigneModal}>
                            <i className="bi-person-plus-fill"></i>
                            <span>{assignedEmployees?.length || 0}</span>
                          </button>
                        </div>
                        <Button
                          type="submit"
                          className="btn"
                          color="info"
                          disabled={updating || task?.status === 3}
                          size="sm"
                        >
                          {updating ? 'Updating...' : 'Update'}
                        </Button>
                      </div>
                    </form>
                    <form onSubmit={handleUpload} className="mt-2">
                      <h6>Attachment files ({task?.files?.length || 0})</h6>
                      <div className="d-flex justify-content-between align-items-center bg-light px-2 rounded-3 mt-2">
                        <div className="d-flex align-items-center gap-1">
                          <div className="pt-2" id="tooltip-3">
                            <Label for="attach">
                              <MaterialIcon icon="attach_file" className="btn-icon" />
                            </Label>
                            <input
                              type="file"
                              id="attach"
                              name="attach"
                              hidden
                              onChange={(e) => setFiles(e.target.files)}
                            />
                            <TooltipHover title="Upload file" id="3" />
                          </div>
                          <span style={{ color: '#1F88E5', fontSize: '12px' }}>
                            {files[0] ? (
                              files[0]?.name
                            ) : (
                              <span style={{ color: '#68757C' }}>Max. 10mb</span>
                            )}
                          </span>
                        </div>
                        <Button
                          type="submit"
                          className="btn"
                          outline
                          size="sm"
                          disabled={task?.status === 3}
                        >
                          {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                      </div>
                    </form>
                    <div className="attach">
                      <ul>
                        {task?.files?.length > 0 &&
                          listFile.map((f) => (
                            <div key={f.file_id} className="d-flex gap-1 align-items-center">
                              <li>
                                <Link
                                  className="file-link"
                                  to={`${fileUrl}taskfiles/${f.file_name}`}
                                  target="_blank"
                                >
                                  {f.file_name}
                                </Link>
                              </li>
                              {userId === f.employe_id.toString() && (
                                <button
                                  type="button"
                                  className="btn d-flex"
                                  style={{ color: '#EF6767' }}
                                  disabled={isDeletingFile}
                                  onClick={() => deleteFile(f.file_id)}
                                >
                                  {isDeletingFile ? (
                                    'Deleting..'
                                  ) : (
                                    <MaterialIcon
                                      icon="delete_outline"
                                      style={{ fontSize: '20px' }}
                                    />
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
              <div className="right">
                <div className="top">
                  {task.task_parent === null ? (
                    <div className="status">
                      <span className="badge bg-light-success text-primary rounded-pill d-inline-block fw-bold">
                        Task
                      </span>
                      {task?.status === 0 ? (
                        <Badge color="info">To Do</Badge>
                      ) : task?.status === 1 ? (
                        <Badge color="primary">In Progress</Badge>
                      ) : task?.status === 2 ? (
                        <Badge color="light" className="text-dark">
                          <i className="bi-clock mr-4" style={{ fontSize: '12px' }}></i>
                          &nbsp; Waiting for approval<strong></strong>
                        </Badge>
                      ) : task?.status === 3 ? (
                        <Badge color="success" className="d-flex">
                          {' '}
                          <i className="bi-check2-circle mr-4" style={{ fontSize: '13px' }}></i>
                          &nbsp; Approved
                        </Badge>
                      ) : (
                        <Badge color="danger">Revision</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="status">
                      <span className="badge bg-light-success text-primary rounded-pill d-inline-block fw-bold">
                        Subtask
                      </span>
                    </div>
                  )}
                  {(userIsPic || task?.created_by === auth?.user?.first_name) && (
                    <ActionMenu menuOptions={menuOptions} action={deleteTask} />
                  )}
                </div>
                <div className="bottom">
                  {history && comments ? (
                    <>
                      <div className="history-item">
                        <div className="comment-name">
                          <span>
                            <strong>{task && task.created_by}</strong> create this task
                          </span>
                          <br />
                        </div>
                        <small>{task && newDate(task.created_at)}</small>
                      </div>
                      {sortHistoryByDate(popContent)?.map((h, i) =>
                        h?.approval_id ? (
                          <Fragment key={h?.approval_id}>
                            <div className="history-item">
                              <div className="comment-name">
                                {h?.status === 0 && i < 1 ? (
                                  <>
                                    <span>
                                      <strong>{h?.pic_task}</strong> sdsd
                                    </span>
                                    <br />
                                    <span style={{ fontSize: '12px' }}>
                                      Deadline: {h?.end_date}
                                    </span>
                                  </>
                                ) : h?.status === 0 && i > 0 ? (
                                  <>
                                    <span>
                                      <strong>{h?.pic_task}</strong> change task to To Do
                                    </span>
                                    <br />
                                    <span style={{ fontSize: '12px' }}>
                                      Deadline: {h?.end_date}
                                    </span>
                                  </>
                                ) : h?.status === 0 ? (
                                  <>
                                    <span>
                                      <strong>{h?.pic_task}</strong> was assigned
                                    </span>
                                    <br />
                                    <span style={{ fontSize: '12px' }}>
                                      Deadline: {h?.end_date}
                                    </span>
                                  </>
                                ) : h?.status === 1 ? (
                                  <>
                                    <span>
                                      <strong>{h?.pic_task}</strong> change task to In Progress
                                    </span>
                                    <br />
                                    <span style={{ fontSize: '12px' }}>
                                      Deadline: {h?.end_date}
                                    </span>
                                  </>
                                ) : h?.status === 2 ? (
                                  <>
                                    <span>
                                      <strong>{h?.pic_task}</strong> change task to Review
                                    </span>
                                    <br />
                                    <span style={{ fontSize: '12px' }}>
                                      Deadline: {h?.end_date}
                                    </span>
                                  </>
                                ) : h?.status === 3 ? (
                                  <span>
                                    <strong>{h?.status_by} </strong> task approved
                                  </span>
                                ) : (
                                  <>
                                    <span>
                                      <strong>{h?.status_by} </strong>change task to Revision
                                    </span>
                                    <br />
                                    <span style={{ fontSize: '12px' }}>
                                      Deadline: {h?.end_date}
                                    </span>
                                  </>
                                )}
                              </div>
                              <small>{newDate(h?.created_at)}</small>
                            </div>
                            {(h?.status === 3 || h?.status === 4) && (
                              <div className="comment-item mt-1">
                                <div className="comment-user ">
                                  <div
                                    className={`comment-teks ${
                                      h?.status === 3 ? 'text-success' : 'text-warning'
                                    }`}
                                  >
                                    <small style={{ fontWeight: '600' }}>
                                      {h?.status === 3 ? 'Comment' : 'Notes'}
                                    </small>
                                    {h.notes}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Fragment>
                        ) : (
                          <div key={h?.comment_id} className="comment-item">
                            <div className="comment-user">
                              <img
                                src={fotoKaryawan(h?.employe_id)}
                                onError={onAvatarError}
                                className="rounded-circle"
                                alt="avatar"
                                width="35"
                                height="35"
                              />
                              <div key={h?.comment_id} className="comment-teks">
                                <small style={{ fontWeight: '600' }}>{h?.first_name}</small>
                                {h?.comment}
                                <div className="comment-time">
                                  <small>{newDate(h?.created_at)}</small>
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </>
                  ) : (
                    'Loading...'
                  )}
                </div>
                <Form onSubmit={handleComment}>
                  <div className="input-comment">
                    <Input
                      type="text"
                      name="comment"
                      ref={inputCommentRef}
                      onChange={(e) => setPostComment({ comment: e.target.value })}
                      autoComplete="off"
                    />
                    <div className="">
                      <Button
                        className="btn"
                        outline
                        color="info"
                        disabled={commentSending}
                        type="submit"
                      >
                        <MaterialIcon icon="send" />
                        {commentSending ? 'Sending' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </Form>
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>
      <Modal isOpen={emModal} size="md" fade={false} centered>
        <ModalHeader toggle={() => setEmModal(false)}>Assigne Employee</ModalHeader>
        <ModalBody>
          <Select
            closeMenuOnSelect
            components={animatedComponents}
            isMulti
            defaultValue={assignedEmployees}
            options={listEmployee}
            onChange={(choice) => setAssignedEmployees(choice)}
          />
        </ModalBody>
      </Modal>
    </>
  );
};

TaskPopup.propTypes = {
  modal: PropTypes.bool,
  setModal: PropTypes.func,
  toggle: PropTypes.any,
  task: PropTypes.any,
  refetch: PropTypes.func,
  mode: PropTypes.string,
  name: PropTypes.string,
};

export default TaskPopup;
