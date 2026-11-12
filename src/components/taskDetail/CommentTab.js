import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import useAxios from '../../hooks/useAxios';
import { alert } from '../atoms/Toast';
import newDate from '../../utils/formatDate';
import useAuth from '../../hooks/useAuth';
import { fotoKaryawan, onAvatarError } from '../../utils/defaultAvatar';

const CommentTab = ({ data }) => {
  const { auth } = useAuth();
  const [comments, setComments] = useState();
  const [postComment, setPostComment] = useState();
  const [commentSending, setCommentSending] = useState(false);

  // const inputCommentRef = useRef();

  const api = useAxios();
  async function fetchComments() {
    await api
      .get(`api/comment/${data?.task_id}`)
      .then((res) => setComments(res.data.data))
      .catch(() => alert('error', 'Get data failed'));
  }

  useEffect(() => {
    fetchComments();
  }, [data]);

  const handleComment = async (e) => {
    e.preventDefault();
    setCommentSending(true);
    if (postComment) {
      postComment.employe_id = auth?.user?.employe_id;
      postComment.task_id = data?.task_id;
      await api
        .post(`api/comment`, postComment)
        .then(() => fetchComments().catch(() => alert('error', 'Comment failed to send')))
        .catch(() => {
          alert('error', 'Something went wrong');
        });
      setPostComment();
      document.getElementById('form-comment').reset();
    } else {
      alert('error', 'Comment field cannot be empty');
    }
    setCommentSending(false);
  };

  const handleChange = (e) => {
    setPostComment({ comment: e.target.value });
    if (e.key === 'Enter') {
      e.preventDefault();
      handleComment(e);
    }
  };

  useEffect(() => {
    if (comments?.length) {
      const objDiv = document.getElementById('area');
      objDiv.scrollTop = objDiv.scrollHeight;
    }
  }, [comments]);

  return (
    <div className="comment">
      <div className="content">
        <div className="comment-list" id="area">
          {comments?.length > 0 ? (
            comments?.map((item) => (
              <div key={item.comment_id} className="item">
                <img src={fotoKaryawan(item.employe_id)} onError={onAvatarError} className="rounded-circle" alt="avatar" width="35" height="35" />
                <div className="text">
                  <div className="user">
                    <h6>{item.first_name}</h6>
                    <span>{newDate(item.created_at)}</span>
                  </div>
                  <p>{item.comment}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No data yet.</div>
          )}
        </div>
        <div className="comment-type">
          <form id="form-comment">
            <textarea
              placeholder="Add a comment..."
              rows="1"
              name="comment"
              onKeyDown={(e) => handleChange(e)}
              required
            />
            <span>{commentSending ? 'Sending...' : ''}</span>
          </form>
        </div>
      </div>
    </div>
  );
};

CommentTab.propTypes = {
  data: PropTypes.object,
};

export default CommentTab;
