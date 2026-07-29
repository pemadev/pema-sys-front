import { lazy } from 'react';
import Loadable from '../layouts/loader/Loadable';
import RequireAuth from '../components/RequireAuth';
import Login from '../pages/auth/Login';
import PemaReport from '../pages/PemaReport';
import Lalin from '../pages/layar/Lalin';
import MasuinPage from '../pages/layar/Masuin';
/****Layouts*****/

const FullLayout = Loadable(lazy(() => import('../layouts/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/BlankLayout')));
const StarterKit = Loadable(lazy(() => import('../pages/Starterkit')));

const Saham = Loadable(lazy(() => import('../pages/Saham')));

/***** Profile ****/
const ProfilePage = Loadable(lazy(() => import('../pages/profile')));
/***** Profile ****/

/***** Notification ****/
const NotificationPage = Loadable(lazy(() => import('../pages/notification')));
/***** Notification ****/

/***** Daily ****/
// const DailyPageOld = Loadable(lazy(() => import('../pages/daily_old/Daily')));
const DailyPage = Loadable(lazy(() => import('../pages/daily/Daily')));
/***** Daily ****/

/***** Asset ****/
const AssetPage = Loadable(lazy(() => import('../pages/asset')));
const DetailAsset = Loadable(lazy(() => import('../pages/asset/DetailAsset')));
const SAsset = Loadable(lazy(() => import('../pages/asset/Scan')));
/***** Asset ****/

/***** Verification****/

const Verification = Loadable(lazy(() => import('../pages/Verif/Verification')));
/***** Verification****/

/***** SPPD****/
const SppdPage = Loadable(lazy(() => import('../pages/sppd')));

/***** Adm****/
const AdmPage = Loadable(lazy(() => import('../pages/adm')));

/***** Kontrak****/
const KontrakPage = Loadable(lazy(() => import('../pages/kontrak')));
/***** Mobilo****/
const MobilPage = Loadable(lazy(() => import('../pages/mobil')));
/***** abse****/
// const AbsenPage = Loadable(lazy(() => import('../pages/absen')));

/***** Pengajuan ****/
const Pengajuan = Loadable(lazy(() => import('../pages/pengajuan/Pengajuan')));

/***** Asset ****/

/***** Projects ****/
const ProjectPage = Loadable(lazy(() => import('../pages/projects')));
const ProjectDetail = Loadable(lazy(() => import('../pages/projects/ProjectDetail')));
const ProjectTaskList = Loadable(lazy(() => import('../pages/projects/AllTask')));
const ProjectReport = Loadable(lazy(() => import('../pages/projects/Report')));
/***** Projects ****/

/***** Timeline ****/
const TimelinePage = Loadable(lazy(() => import('../pages/timeline/Timeline')));
/***** Timeline ****/

/***** Tickets ****/
const TicketPage = Loadable(lazy(() => import('../pages/tickets')));
/***** Tickets ****/

/***** Vendor ****/
const DashboardPage = Loadable(lazy(() => import('../pages/vendor/dashboard/Dashboard')));
const InprogressTaskPage = Loadable(lazy(() => import('../pages/projects/InprogressTaskList')));
const VendorCompanyPage = Loadable(lazy(() => import('../pages/vendor/Company')));
const RequestPage = Loadable(lazy(() => import('../pages/vendor/requests/Request')));
const VerificationPage = Loadable(lazy(() => import('../pages/vendor/checks/DocumentCheck')));
const NewTenderPage = Loadable(lazy(() => import('../pages/vendor/tender/NewTender')));
const UpdateTenderPage = Loadable(lazy(() => import('../pages/vendor/tender/EditTender')));
const VendorCompanyDetail = Loadable(lazy(() => import('../pages/vendor/CompanyDetail')));
const VendorDocPreview = Loadable(lazy(() => import('../pages/vendor/DocumentPreview')));

// Manager Pages
const ApprovalTender = Loadable(lazy(() => import('../pages/vendor/approval/Tender')));
// Manager Pages

/***** Vendor ****/

/***** Forms ****/
const PentryPage = Loadable(lazy(() => import('../pages/form/Pentry')));
const AtkPage = Loadable(lazy(() => import('../pages/form/Atk')));
/***** Forms ****/

/***** Forms ****/
const PentryReportPage = Loadable(lazy(() => import('../pages/report/PentryReport')));
const AtkReportPage = Loadable(lazy(() => import('../pages/report/AtkReport')));
/***** Forms ****/

/***** QrCode ****/
const QrCodeGenerator = Loadable(lazy(() => import('../pages/qrcode/QrCodeGenerator')));
/***** QrCode ****/

/***** Pages ****/

const Dashboard2 = Loadable(lazy(() => import('../views/dashboards/Dashboard2')));
const Unauthorized = Loadable(lazy(() => import('../pages/auth/Unauthorized')));
const ChangePassword = Loadable(lazy(() => import('../pages/auth/ChangePassword')));
const ForgotPassword = Loadable(lazy(() => import('../pages/auth/ForgotPassword')));
const NewPassword = Loadable(lazy(() => import('../pages/auth/NewPassword')));
/***** CASL Access Control ****/

// Report

// const PemaReport= Loadable(lazy(() => import('../pages/PemaReport')));

// const CASL = Loadable(lazy(() => import('../views/apps/accessControlCASL/AccessControl')));

/***** Auth Pages ****/
// const Error = Loadable(lazy(() => import('../views/auth/Error')));
// const RegisterFormik = Loadable(lazy(() => import('../views/auth/RegisterFormik')));
// const Maintanance = Loadable(lazy(() => import('../views/auth/Maintanance')));
// const LockScreen = Loadable(lazy(() => import('../views/auth/LockScreen')));
// const RecoverPassword = Loadable(lazy(() => import('../views/auth/RecoverPassword')));

const ROLES = {
  SuperAdmin: 'Super Admin',
  Admin: 'Admin',
  Presdir: 'Presdir',
  Director: 'Director',
  Manager: 'Manager',
  Supervisor: 'Supervisor',
  Staff: 'Staff',
  Employee: 'Employee',
  AdminPengajuan: 'AdminPengajuan',
  ManagerUmum: 'ManagerUmum',
  DirekturUmumKeuangan: 'DirekturUmumKeuangan',
};

const formAllowedRoles = ['Picpentry', 'Picatk'];
const vendorAllowedRoles = ['AdminVendorUmum', 'AdminVendorScm', 'VendorViewer'];
const reportAllowedRoles = ['Picpentry', 'Picatk'];
const assetAllowedRoles = ['Employee'];
const inProgressTaskAllowedRoles = ['Director'];
const ApprovalTenderAllowedRoles = ['Manager'];
const PengajuanAllowedRoles = ['AdminPengajuan', 'ManagerUmum', 'DirekturUmumKeuangan', 'Presdir'];
const LayarRoles = ['AdminLayar'];

/*****Routes******/
const ThemeRoutes = [
  // PROTECTED ROUTES
  {
    path: '/',
    element: <RequireAuth allowedRoles={[ROLES.Employee]} />,
    children: [
      // {
      //   path: 'absen',
      //   name: 'Absensi',
      //   element: <AbsenPage />,
      // },
      {
        path: '/',
        element: <FullLayout />,
        children: [
          {
            path: '',
            name: 'Dashboard',
            element: <Dashboard2 />,
          },
          {
            path: 'all-notifications',
            name: 'Notifications',
            element: <NotificationPage />,
          },
          {
            path: 'director',
            element: <RequireAuth allowedRoles={inProgressTaskAllowedRoles} />,
            children: [
              {
                path: 'inprogress-task',
                name: 'Inprogress Task',
                element: <InprogressTaskPage />,
              },
            ],
          },
          {
            path: 'profile',
            name: 'Profile',
            element: <ProfilePage />,
          },
          {
            path: 'starterkit',
            name: 'Starterkit',
            element: <StarterKit />,
          },
          {
            path: 'projects',
            name: 'Projects',
            element: <ProjectPage />,
          },
          {
            path: 'timeline',
            name: 'Timeline',
            element: <TimelinePage />,
          },
          // {
          //   path: 'daily-old',
          //   name: 'Daily Old',
          //   element: <DailyPageOld />,
          // },
          {
            path: 'daily',
            name: 'Daily',
            element: <DailyPage />,
          },
          {
            path: 'asset',
            element: <RequireAuth allowedRoles={assetAllowedRoles} />,
            children: [{ path: '', name: 'Asset', element: <AssetPage /> }],
          },
          {
            path: 'asset/:assetId',
            name: 'Detail Asset',
            element: <DetailAsset />,
          },
          {
            path: 'sppd',
            name: 'SPPD',
            element: <SppdPage />,
          },
          {
            path: 'adm',
            name: 'Surat Menyurat',
            element: <AdmPage />,
          },
          {
            path: 'mobil-operational',
            name: 'Mobil Operasional',
            element: <MobilPage />,
          },
          {
            path: 'kontrak',
            name: 'Kontrak',
            element: <KontrakPage />,
          },
          {
            path: 'projects/details/:projectId',
            name: 'Project Details',
            element: <ProjectDetail />,
          },
          {
            path: 'projects/alltask/:projectId',
            name: 'Projects',
            element: <ProjectTaskList />,
          },
          {
            path: 'tickets',
            name: 'Tickets',
            element: <TicketPage />,
          },
          {
            path: 'vendor',
            name: 'Vendor',
            element: <RequireAuth allowedRoles={vendorAllowedRoles} />,
            children: [
              {
                path: '',
                name: 'Dashboard',
                element: <DashboardPage />,
              },
              {
                path: 'company/:companyId',
                name: 'company detail',
                element: <VendorCompanyDetail />,
              },
              {
                path: 'company',
                name: 'company',
                element: <VendorCompanyPage />,
              },
              {
                path: 'requests',
                name: 'Requests',
                element: <RequestPage />,
              },
              {
                path: 'requests/check/:id',
                name: 'Verification',
                element: <VerificationPage />,
              },
              {
                path: 'new-tender',
                name: 'New Tender',
                element: <NewTenderPage />,
              },
              {
                path: 'update-tender/:id',
                name: 'Update Tender',
                element: <UpdateTenderPage />,
              },
            ],
          },
          {
            path: 'tender/approval',
            name: 'Tender',
            element: <ApprovalTender allowedRoles={ApprovalTenderAllowedRoles} />,
          },
          {
            path: 'forms',
            name: 'Form',
            element: <RequireAuth allowedRoles={formAllowedRoles} />,
            children: [
              {
                path: 'pentry',
                name: 'Pentry',
                element: <PentryPage />,
              },
              {
                path: 'atk',
                name: 'Atk',
                element: <AtkPage />,
              },
            ],
          },
          {
            path: 'reports',
            name: 'Report',
            element: <RequireAuth allowedRoles={reportAllowedRoles} />,
            children: [
              {
                path: 'pentry',
                name: 'Pentry',
                element: <PentryReportPage />,
              },
              {
                path: 'atk',
                name: 'Atk',
                element: <AtkReportPage />,
              },
            ],
          },
          {
            path: 'auth/change-password',
            name: 'Change Password',
            element: <ChangePassword />,
          },
          {
            path: 'pengajuan',
            name: 'Pengajuan',
            element: <Pengajuan allowedRoles={PengajuanAllowedRoles} />,
          },
          {
            path: 'insert-image',
            name: 'Masuin',
            element: <MasuinPage allowedRoles={LayarRoles} />,
          },
        ],
      },
      {
        path: 'preview',
        name: 'Document Preview',
        element: <VendorDocPreview />,
      },
    ],
  },
  // PROTECTED ROUTES

  // LOGIN ROUTE
  {
    path: '/auth',
    element: <BlankLayout />,
    children: [
      {
        path: 'login',
        name: 'Login',
        element: <Login />,
      },
      {
        path: 'forgot-password',
        name: 'Forgot Password',
        element: <ForgotPassword />,
      },
      {
        path: 'new-password',
        name: 'New Password',
        element: <NewPassword />,
      },
    ],
  },
  // LOGIN ROUTE

  // report page
  {
    path: '/',
    children: [
      {
        path: 'projects/:projectId/task-report',
        name: 'Task Report',
        element: <ProjectReport />,
      },
    ],
  },
  // report page

  // Unauthorized

  {
    path: '/',
    element: <BlankLayout />,
    children: [
      {
        path: 'unauthorized',
        name: 'Unauthorized',
        element: <Unauthorized />,
      },
      {
        path: 'qrcode-generator',
        name: 'QrCode Generator',
        element: <QrCodeGenerator />,
      },
    ],
  },


  // report

  {
    path: '/saham',
    element: <Saham />,
  },
  {
    path: '/pema-report',
    element: <PemaReport />,
  },
  {
    path: '/abs',
    element: <Lalin />,
  },
  {
    path: '/asset/v/:assetId',
    name: 'Scan Asset',
    element: <SAsset />,
  },
  {
    path: '/verification/:idDoc',
    name: 'Verification',
    element: <Verification />,
  },
  // Unauthorized
];

export default ThemeRoutes;
