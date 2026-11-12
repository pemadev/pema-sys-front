import React, { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  Col,
  Form,
  FormGroup,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
} from 'reactstrap';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MaterialIcon from '@material/react-material-icon';
import PropTypes from 'prop-types';
import useAuth from '../../hooks/useAuth';
import useAxios from '../../hooks/useAxios';
import newDate from '../../utils/formatDate';
import { alert } from '../../components/atoms/Toast';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';

const ReviewBastTab = ({ setTotalBastReview }) => {
  const { auth } = useAuth();
  const { projectId } = useParams();
  const [modal, setModal] = useState(false);
  const [mode, setMode] = useState('');
  const [comments, setComments] = useState();
  const [oldPic, setOldPic] = useState();
  const [notifTo, setNotifTo] = useState();
  const [reviewBy, setReviewBy] = useState();
  const [loading, setLoading] = useState(false);

  const api = useAxios();

  const { isLoading, error, data, refetch } = useQuery({
    queryKey: ['bast-review'],
    queryFn: () =>
      api.get(`api/project/${projectId}/${auth?.user.employe_id}/bast/review`).then((res) => {
        return res.data.data;
      }),
  });

  useEffect(() => {
    setTotalBastReview(10);
  }, [data]);

  const handleForm = (modeRes, oldPicP, notifToId, byEmploye) => {
    setModal(true);
    setMode(modeRes);
    setOldPic(oldPicP || null);
    setNotifTo(notifToId);
    setReviewBy(byEmploye);
  };

  const toggle = () => {
    setModal(!modal);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await api
      .post(`api/project/${data?.history_id}/bast/approval`, {
        project_id: projectId,
        old_pic: oldPic,
        notif_to: notifTo,
        review_by: reviewBy,
        status: mode === 'approve' ? 'handover' : 'revision',
        note: comments,
      })
      .then(() => {
        refetch();
        alert('success', `BAST has been ${mode === 'approve' ? 'approved' : 'reviewed'}`);
      })
      .catch((err) => console.log(err));
    setModal(false);
    setLoading(false);
  };

  return (
    <>
      <Col>
        {isLoading ? (
          <Card>
            <CardBody>Loading...</CardBody>
          </Card>
        ) : error ? (
          'Something went wrong.'
        ) : (
          <Card className="custom-card">
            {data && (
              <CardBody>
                <CardTitle tag="h4" className="d-flex justify-content-between">
                  <div className="d-flex gap-2">
                    <Badge color="light" className="text-dark">
                      Review BAST
                    </Badge>
                  </div>
                  <span style={{ fontSize: '14px' }}>{newDate(data.created_at)}</span>
                </CardTitle>
                <div className="d-flex  justify-content-center">
                  <h5>
                    Handover of the project from <strong>{data.old_pic_division}</strong> to{' '}
                    <strong>{data.new_pic_division}</strong>
                  </h5>
                </div>
                <span className="text-dark">BAST file:</span>
                <div className="">
                  <div className="d-flex gap-3">
                    <Link className="file-link" to="" target="blank">
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
                        <small className="text-muted">{data.old_pic_division}</small>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      type="button"
                      size="md"
                      color="warning"
                      outline
                      onClick={() => handleForm('revision', data.old_pic_id, data.review_by)}
                    >
                      Revision
                    </Button>
                    <Button
                      type="button"
                      size="md"
                      color="success"
                      onClick={() =>
                        handleForm('approve', data.old_pic_id, data.new_pic_id, data.review_by)
                      }
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </CardBody>
            )}
          </Card>
        )}
      </Col>
      <Modal isOpen={modal} toggle={toggle.bind(null)} size="md" fade={false} centered>
        <ModalHeader toggle={toggle.bind(null)}>
          {mode === 'approve' ? 'Approval' : 'Revision'}
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody>
            <FormGroup>
              <Input
                type="textarea"
                id="goals"
                name="goals"
                placeholder="Comment here.."
                rows="3"
                required
                onChange={(e) => setComments(e.target.value)}
              />
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" outline onClick={toggle.bind(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              color={`${mode === 'approve' ? 'success' : 'warning'}`}
              disabled={loading}
              className="d-flex gap-1 align-items-center"
            >
              {loading ? (
                <>
                  <Spinner className="me-2" size="sm" />
                  Sending...
                </>
              ) : (
                <>
                  <MaterialIcon icon="send" style={{ fontSize: '20px' }} />
                  {mode === 'approve' ? 'Approve' : 'Send'}
                </>
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </>
  );
};

ReviewBastTab.propTypes = {
  setTotalBastReview: PropTypes.func,
};

export default ReviewBastTab;
