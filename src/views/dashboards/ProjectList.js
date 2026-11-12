import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, CardTitle, Col, Input, Row } from 'reactstrap';
import useAxios from '../../hooks/useAxios';
import CircularPercentage from '../../components/atoms/circularPercentage/CircularPercentage';
import useAuth from '../../hooks/useAuth';
import IndoDate from '../../utils/IndoDate';
import isExpired from '../../utils/isExpired';
import FilterYear from '../../components/filterYear/FilterYear';
import SkeletonProjectList from '../../components/skeleton/projectList/SkeletonProjectList';
import NoDataYet from '../../components/noDataYet/NoDataYet';
import FailedInformation from '../../components/failedInformation/FailedInformation';
import { onAvatarError } from '../../utils/defaultAvatar';


const HCIS_URL = process.env.REACT_APP_HCIS_BE;

const ProjectList = () => {
  const { auth } = useAuth();
  const [divisions, setDivisions] = useState([]);
  const [list, setList] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState();
  const [progressList, setProgressList] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const api = useAxios();

  const { isLoading, error, data } = useQuery({
    queryKey: ['projectsdash', year],
    queryFn: () =>
      api
        .get(
          `${
            auth?.user?.roles.includes('Director')
              ? `api/project?year=${year}`
              : `api/project/${auth?.user.employe_id}/list?for=dashboard&year=${year}`
          }`,
        )
        .then((res) => {
          setDivisions(res.data.divisions);

          // let filtered = [];
          // if (auth?.user?.roles?.includes('Director')) {
          //   const allData = res.data.data.filter((item) => item.total_progress > 10);

          //   for (let index = 0; index < allData.length; index++) {
          //     if (index < 10) {
          //       filtered.push(allData[index]);
          //     }
          //   }
          // } else {
          //   filtered = res.data.data;
          // }

          // setList(filtered.reverse());
          setSelectedDivision('all');
          // return filtered.reverse();
          return res.data.data;
        }),
  });

  useEffect(() => {
    if (auth?.user?.roles?.includes('Director')) {
      if (selectedDivision === 'all') {
        const filtered = [];
        const allData = data?.filter((item) => item.total_progress > 10);
        for (let index = 0; index < allData.length; index++) {
          if (index < 10) {
            filtered.push(allData[index]);
          }
        }
        setList(filtered.reverse());
      } else {
        setList(data?.filter((item) => item.division.toString() === selectedDivision));
      }
    } else {
      const filtered = [];
      for (let index = 0; index < data?.length; index++) {
        if (index < 10) {
          filtered.push(data[index]);
        }
      }
      setList(filtered);
    }
  }, [selectedDivision, data]);

  const fethProgress = async (ids) => {
    await api
      .post('api/project/progress/collection', { ids })
      .then((res) => {
        setProgressList(res.data.data);
      })
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    const projectIds = () => {
      const ids = [];
      for (let idx = 0; idx < list?.length; idx++) {
        ids.push(list[idx].project_id);
      }
      return ids;
    };

    if (projectIds()?.length > 0) {
      fethProgress(projectIds());
    }
  }, [list]);

  const progressValue = (id) => {
    const result = progressList?.filter((row) => row.project_id === id);
    return result[0]?.progress !== 0 ? result[0]?.progress?.toFixed() : 0;
  };

  const newTab = (pId) => {
    window.open(`projects/details/${pId}`, '_blank', 'noopener');
  };

  return (
    <Row>
      <Col lg="12">
        <Card className="rounded-3">
          <CardBody className="d-flex flex-column gap-2" style={{ minHeight: '130px' }}>
            <Row lg="d-flex justify-content-between">
              <Col sm="12" md="6" lg="3">
                <CardTitle tag="h4">
                  Projects {auth?.user?.roles?.includes('Director') ? 'Inprogress' : ''}{' '}
                </CardTitle>
              </Col>
              <Col
                sm="12"
                md="6"
                lg="5"
                className="d-flex gap-2 align-items-end justify-content-end"
              >
                {auth?.user?.roles.includes('Director') ? (
                  <div className="w-75">
                    <Input
                      type="select"
                      bsSize="sm"
                      onChange={(e) => setSelectedDivision(e.target.value)}
                      value={selectedDivision}
                    >
                      <option value="all">All Division</option>
                      {divisions?.map((d) => (
                        <option key={d.organization_id} value={d.organization_id}>
                          {d.organization_name}{' '}
                        </option>
                      ))}
                    </Input>
                  </div>
                ) : (
                  //   <FilterData />
                  <FilterYear {...{ year, setYear }} />
                )}
                <div className="d-flex">
                  <Link to="projects" style={{ textDecoration: 'none' }}>
                    <Button
                      type="button"
                      size="sm"
                      outline
                      color="info"
                      className="rounded-2"
                      block
                    >
                      See all
                    </Button>
                  </Link>
                </div>
              </Col>
            </Row>
            {isLoading ? (
              <SkeletonProjectList listLength={4} height="md" />
            ) : error ? (
              <FailedInformation />
            ) : (
              <>
                {list?.length > 0 ? (
                  list?.map((p, i) => (
                    <Link
                      key={p.project_id}
                      className="d-flex justify-content-between rounded-3 px-2 py-2 align-items-center link-item text-dark bg-light"
                      // to={`projects/details/${p.project_id}`}
                      style={{ textDecoration: 'none' }}
                      onClick={() => newTab(p.project_id)}
                    >
                      <Col lg="12">
                        <Row lg="12" style={{ paddingRight: '5px' }}>
                          <Col lg="6">
                            <table>
                              <tbody style={{ height: 'auto !important' }}>
                                <tr>
                                  <td style={{ minWidth: '30px', textAlign: 'left' }}>
                                    <span className="text-muted" style={{ marginLeft: '12px' }}>
                                      {i + 1}
                                    </span>
                                  </td>
                                  <td>
                                    <abbr title={p.project_name} style={{ textDecoration: 'none' }}>
                                      <span className="fw-bold" style={{ fontSize: '13px' }}>
                                        {/* {p.project_name.trim().length > 40
                                    ? `${p.project_name.substring(0, 42)}...`
                                    : p.project_name} */}
                                        {p.project_name}
                                      </span>
                                      <div>
                                        <span className="badge text-primary bg-light-primary rounded-pill d-inline-block">
                                          <small className="fw-bold">{p.organization_name}</small>
                                        </span>
                                      </div>
                                    </abbr>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </Col>
                          <Col xs="12" sm="12" lg="5">
                            <Row lg="12" className="my-auto h-100 ">
                              <Col xs="4" sm="4" lg="4" className="my-auto " content="center">
                                <div style={{ marginBottom: '-7px' }}>
                                  <small className="text-muted" style={{ fontSize: '12px' }}>
                                    Deadline{' '}
                                  </small>
                                </div>
                                <small
                                  className={`${
                                    isExpired(p.current_stage?.end_date) ? 'text-danger' : ''
                                  }`}
                                >
                                  {IndoDate(p.current_stage?.end_date)}
                                </small>
                              </Col>
                              <Col xs="4" sm="4" lg="4" className="d-flex align-items-center">
                                <span
                                  className="badge text-info bg-light-info rounded-pill d-inline-block fw-bold"
                                  style={{ textTransform: 'capitalize' }}
                                >
                                  {p.category}
                                </span>
                              </Col>
                              <Col
                                xs="4"
                                sm="4"
                                lg="4"
                                className="d-flex align-items-center justify-content-end"
                              >
                                <div className="d-flex gap-1 justify-content-center align-items-center">
                                  <div className="circular-progress">
                                    <CircularPercentage
                                      // data={parseInt(p.total_progress.toFixed(), 10)}
                                      data={
                                        progressValue(p.project_id)
                                          ? parseInt(progressValue(p.project_id), 10)
                                          : 0
                                      }
                                    />
                                  </div>
                                </div>
                              </Col>
                            </Row>
                          </Col>
                          <Col lg="1" className="my-auto d-flex justify-content-start px-2">
                            <div className="p-2">
                              <img
                                src={`${HCIS_URL}employee/file?f=photo-profil&id=${p.pic_active?.employe_id}`}
                                className="rounded-circle"
                                alt="avatar"
                                width="40"
                                height="40"
                                onError={onAvatarError}
                              />
                            </div>
                          </Col>
                        </Row>
                      </Col>
                    </Link>
                  ))
                ) : (
                  <NoDataYet />
                )}
              </>
            )}
          </CardBody>
        </Card>
      </Col>
      {/* <Col lg="4">
          <Card>
            <CardBody></CardBody>
          </Card>
        </Col> */}
    </Row>
  );
};

export default ProjectList;
