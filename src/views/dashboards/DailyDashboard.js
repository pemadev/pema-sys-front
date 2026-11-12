import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardTitle } from 'reactstrap';
import { useQuery } from '@tanstack/react-query';
import useAxios from '../../hooks/useAxios';
import CircularPercentage from '../../components/atoms/circularPercentage/CircularPercentage';
import SkeletonProjectList from '../../components/skeleton/projectList/SkeletonProjectList';
import NoDataYet from '../../components/noDataYet/NoDataYet';
import FailedInformation from '../../components/failedInformation/FailedInformation';
import FilterYear from '../../components/filterYear/FilterYear';
import { onAvatarError } from '../../utils/defaultAvatar';


const profileFile = process.env.REACT_APP_HCIS_BE;

const DailyDashboard = () => {
  const api = useAxios();
  const thisYear = new Date().getFullYear();
  //   const lastYear = thisYear - 1;

  const [selectedYear, setSelectedYear] = useState(thisYear);
  const [dailyBawahan, setDailyBawahan] = useState([]);

  const { isLoading, error, data } = useQuery({
    queryKey: ['daily-dashboard-summary', selectedYear],
    queryFn: () => api.get(`api/daily/dashboard?year=${selectedYear}`).then((res) => res.data),
  });

  useEffect(() => {
    if (data?.daily_bawahan) {
      setDailyBawahan(data.daily_bawahan);
    }
  }, [data]);

  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
  };

  return (
    <Card className="rounded-3">
      <CardBody className="d-flex flex-column gap-1">
        <div className="d-flex justify-content-between align-items-center">
          <CardTitle tag="h4">Dailies</CardTitle>

          <FilterYear
            year={selectedYear}
            setYear={handleYearChange}
            // thisYear={thisYear}
            // lastYear={lastYear}
          />
        </div>

        <div className="d-flex flex-column gap-2 justify-content-center">
          {isLoading ? (
            <SkeletonProjectList listLength={3} height="sm" />
          ) : error ? (
            <FailedInformation />
          ) : dailyBawahan.length > 0 ? (
            dailyBawahan.map((e, i) => {
              const dailyProgress = e.progress;

              return (
                <div key={e.employe_id || i} className="d-flex justify-content-between gap-1">
                  <div
                    className="d-flex w-100 justify-content-between align-items-center p-2 rounded-3 link-item-bordered bg-white"
                    style={{ border: '1px dashed #28a745' }}
                  >
                    <div className="d-flex w-100 justify-content-between align-items-center">
                      <div
                        className="d-flex gap-2 col-md-10 align-items-center text-muted"
                        style={{ fontSize: '14px' }}
                      >
                        <span>{i + 1}</span>

                        <div className="d-flex flex-column col-md-12">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <img
                              src={`${profileFile}employee/file?f=photo-profil&id=${e.employe_id}`}
                              alt={e.name}
                              onError={onAvatarError}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                              }}
                            />

                            <div className="d-flex flex-column">
                              <span className="text-dark fw-bold">{e.name}</span>
                              <span className="text-muted">{e.position}</span>
                            </div>
                          </div>

                          <div className="d-flex align-items-end gap-3">
                            <span className="badge bg-info bg-opacity-25 text-info rounded-pill px-3">
                              All: {e.total}
                            </span>
                            <span className="badge bg-success bg-opacity-25 text-success rounded-pill px-3">
                              Done: {e.approved}
                            </span>
                            <span className="badge bg-warning bg-opacity-25 text-warning rounded-pill px-3">
                              In Progress: {e.inprogress}
                            </span>
                            <span className="badge bg-primary bg-opacity-25 text-primary rounded-pill px-3">
                              Review: {e.review}
                            </span>
                            <span className="badge bg-danger bg-opacity-25 text-danger rounded-pill px-3">
                              Revised: {e.revised}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-1 justify-content-center align-items-center">
                      <div className="circular-progress">
                        <CircularPercentage
                          data={parseInt(dailyProgress.toFixed(), 10)}
                          color="green"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <NoDataYet />
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default DailyDashboard;
