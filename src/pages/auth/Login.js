import React, { useEffect, useContext, useState } from 'react';
import {
  Alert,
  Button,
  Label,
  FormGroup,
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Input,
  Spinner,
} from 'reactstrap';
import { Formik, Field, Form, ErrorMessage } from 'formik';
import { Eye, EyeOff } from 'react-feather';
import * as Yup from 'yup';
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { ReactComponent as LeftBg } from '../../assets/images/bg/login-bgleft.svg';
import { ReactComponent as RightBg } from '../../assets/images/bg/login-bg-right.svg';
import { AuthContext } from '../../context/AuthContext';
import useAuth from '../../hooks/useAuth';
import useAxios from '../../hooks/useAxios';
import AuthLogo from '../../layouts/logo/AuthLogo';

const Login = () => {
  const { auth } = useAuth();
  const api = useAxios();
  const { loading, error, dispatch } = useContext(AuthContext);
  const [errStatus, setErrStatus] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const initialValues = {
    email: '',
    password: '',
  };

  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Email is invalid').required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  });

  const handleLogin = async (data) => {
    dispatch({ type: 'LOGIN_START' });

    await api
      .post('api/auth/login', data)
      .then((res) => {
        navigate(location.state?.from || '/');
        dispatch({ type: 'LOGIN_SUCCESS', payload: res.data.auth });
      })
      .catch((err) => {
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: err.response?.data.message || 'Something went wrong.',
        });
        setErrStatus(true);
      });
  };

  useEffect(()=>{
    console.log(location.state?.from)
  },[])

  useEffect(() => {
    setTimeout(() => {
      setErrStatus(false);
    }, 5000);
  }, [errStatus]);

  return auth ? (
    <Navigate to="/" />
  ) : (
    <div className="loginBox">
      <LeftBg className="position-absolute left bottom-0" />
      <RightBg className="position-absolute end-0 top" />
      <Container fluid className="h-100">
        <Row className="justify-content-center align-items-center h-100">
          <Col lg="12" className="loginContainer">
            <AuthLogo />
            <Card>
              <CardBody className="p-4 m-1">
                <h4 className="mb-0 fw-bold mb-4 text-center">Login</h4>
                {/* <small className="pb-4 d-block">
                  Do not have an account? <Link to="/auth/registerformik">Sign Up</Link>
                </small> */}
                <Formik
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  onSubmit={(fields) => handleLogin(fields)}
                >
                  {({ errors, touched }) => (
                    <Form>
                      <FormGroup>
                        <Label htmlFor="email">Email</Label>
                        <Field
                          name="email"
                          type="text"
                          className={`form-control${
                            errors.email && touched.email ? ' is-invalid' : ''
                          }`}
                        />
                        <ErrorMessage name="email" component="div" className="invalid-feedback" />
                      </FormGroup>
                      <FormGroup>
                        <Label htmlFor="password">Password</Label>
                        <div className="position-relative">
                          <Field
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            className={`form-control${
                              errors.password && touched.password ? ' is-invalid' : ''
                            }`}
                            style={{ paddingRight: '2.5rem' }}
                          />
                          <button
                            type="button"
                            className="btn btn-link position-absolute top-0 end-0 h-100 px-3 text-muted"
                            style={{ zIndex: 5 }}
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            title={showPassword ? 'Hide password' : 'Show password'}
                            tabIndex={-1}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <ErrorMessage
                          name="password"
                          component="div"
                          className="invalid-feedback d-block"
                        />
                      </FormGroup>
                      <FormGroup className="form-check d-flex" inline>
                        <Label check>
                          <Input type="checkbox" />
                          Remember me
                        </Label>
                        <Link className="ms-auto text-decoration-none" to="/auth/forgot-password">
                          <small>Forgot Password?</small>
                        </Link>
                      </FormGroup>
                      <FormGroup>
                        <div className="d-grid gap-2">
                          <Button
                            type="submit"
                            color="primary"
                            className="btn btn-primary btn-block"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Spinner className="me-2" size="sm" color="light" />
                                loading ..
                              </>
                            ) : (
                              'Login'
                            )}
                          </Button>
                        </div>
                      </FormGroup>
                    </Form>
                  )}
                </Formik>
                {errStatus && <Alert color="danger">{error}</Alert>}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
