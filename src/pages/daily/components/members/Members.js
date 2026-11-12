import React, { useState } from 'react';
import './Members.scss';
import PropTypes from 'prop-types';
import { onAvatarError } from '../../../../utils/defaultAvatar';


const profileFile = process.env.REACT_APP_HCIS_BE;

const Members = ({ data }) => {
  const [openPopupu, setOpenPopup] = useState(false);

  return (
    <div className="members-container">
      {openPopupu && (
        <>
          <div className="members-popup-overlay" onClick={() => setOpenPopup(false)}></div>
          <div className="members-popup">
            <div className="members-popup-body">
              <div className="members-popup-header">
                <div className="members-popup-title">Member{data?.length > 1 ? 's' : ''}</div>
              </div>
              <div className="members-popup-content">
                <div className="members-list">
                  {data?.map((member) => (
                    <div key={member.employe_id} className="members-list-item">
                      <div className="members-person">
                        <div className="members-avatar">
                          <img
                            src={`${profileFile}employee/file?f=photo-profil&id=${member.employe_id}`}
                            alt={member.name}
                            onError={onAvatarError}
                          />
                        </div>
                        <div className="members-info">
                          <h4>{member.name}</h4>
                          <span>{member.position_name}</span>
                        </div>
                      </div>
                      <div className="members-task">
                        <span>{member.total_daily} Task</span>
                        <span>{member.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="members-item" onClick={() => setOpenPopup(true)}>
        {/* avatar image */}
        {data?.map((member) => (
          <div key={member.employe_id} className="ava-pic">
            <img
              src={`${profileFile}employee/file?f=photo-profil&id=${member.employe_id}`}
              alt={member.name}
              onError={onAvatarError}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

Members.propTypes = {
  data: PropTypes.array,
};

export default Members;
