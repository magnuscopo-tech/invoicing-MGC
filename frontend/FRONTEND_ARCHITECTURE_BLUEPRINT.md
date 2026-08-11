# Frontend Architecture Blueprint

This blueprint captures the reusable engineering standards of this React frontend architecture. It intentionally avoids business-domain details and focuses on structure, conventions, responsibilities, and repeatable implementation patterns for future projects.

## 1. Overall Project Philosophy

The project follows a pragmatic React single-page application architecture built around Vite, React Router, Redux Toolkit, axios, Tailwind CSS, reusable component folders, and centralized API utilities.

Core principles:

- Keep bootstrapping minimal: `main.jsx` wires global providers, styles, and app-level containers.
- Keep routing centralized: `App.jsx` owns route decisions, authentication checks, protected routes, redirects, and app-wide trackers.
- Keep page files thin: files under `src/pages/` should load or compose feature components, not contain deep UI or API logic.
- Keep feature UI grouped: feature-specific components live under `src/components/<feature>/`.
- Keep shared UI grouped by behavior: layouts, loaders, modals, custom controls, charts, and generic visual primitives live under dedicated component folders.
- Keep API calls outside UI: components call feature API wrappers or services instead of calling axios directly.
- Keep endpoint strings centralized: URL constants belong in one API constants module.
- Keep global state selective: Redux is used for cross-route concerns such as authentication and shared task progress; local state stays inside components.
- Keep reusable helpers centralized: validation, common form helpers, toast helpers, activity logging, and data lists live under utilities.
- Prefer composition over inheritance: pages compose layouts, feature containers, cards, filters, details panels, loaders, and modals.

Scalability comes from strict folder responsibility, predictable naming, and explicit data flow:

```text
Route -> Protected Layout -> Page -> Feature Component -> Service/API Wrapper -> API Method -> Axios Instance -> Backend
```

Maintainability depends on separation of concerns:

- Routing decides which page renders.
- Layout decides the shell around protected content.
- Pages decide loading and top-level feature composition.
- Feature components manage feature-local UI state.
- API wrappers manage request orchestration and response shaping for a feature.
- Redux stores only app-wide state.
- Utilities contain stateless reusable logic.

## 2. Complete Folder Structure

Reference tree:

```text
.
├── public/
│   └── assets/
│       ├── about/
│       ├── bg/
│       └── evpImages/
├── src/
│   ├── components/
│   │   ├── custom/
│   │   ├── dashboard/
│   │   ├── home/
│   │   ├── interviewPanel/
│   │   ├── jobs/
│   │   ├── layouts/
│   │   ├── loader/
│   │   │   ├── home/
│   │   │   ├── interview/
│   │   │   └── job/
│   │   ├── matchedJobs/
│   │   ├── modal/
│   │   │   ├── auth/
│   │   │   ├── home/
│   │   │   ├── interviewPanel/
│   │   │   ├── Jobs/
│   │   │   ├── referral/
│   │   │   └── sparsh/
│   │   ├── profile/
│   │   ├── questionnaires/
│   │   ├── referrals/
│   │   ├── sparsh/
│   │   └── video/
│   ├── landingPage/
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── home/
│   │   ├── interviewPanel/
│   │   ├── jobs/
│   │   ├── matchedJobPage/
│   │   ├── profile/
│   │   ├── questionnaires/
│   │   ├── referral/
│   │   └── sparsh/
│   ├── ReduxFeature/
│   │   ├── Authenthicate/
│   │   └── task/
│   ├── ReduxStore/
│   ├── sections/
│   ├── Services/
│   │   └── apiCalling/
│   ├── Utlis/
│   │   ├── Common/
│   │   └── Toastify/
│   ├── App.jsx
│   ├── AppLayout.jsx
│   ├── ProtectedLayout.jsx
│   ├── activityTrackker.jsx
│   ├── index.css
│   └── main.jsx
├── eslint.config.js
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

### `public/`

Purpose: Static files served directly by Vite.

Responsibilities:

- Store images, videos, logos, and other public assets.
- Keep large media outside component code.

Allowed files:

- `.png`, `.jpg`, `.jpeg`, `.svg`, `.mp4`, `.webp`, static icons.

Forbidden files:

- React components, API files, business logic, secrets, environment-specific credentials.

Best practices:

- Group assets by purpose, such as `assets/bg/` or `assets/about/`.
- Use descriptive filenames.
- Optimize large images and video files before committing.

### `src/`

Purpose: Main application source.

Responsibilities:

- Contain all React code, styling entrypoint, services, utilities, Redux, layouts, pages, and route-level logic.

Forbidden files:

- Build artifacts, generated `dist`, secrets, large unoptimized binaries.

### `src/main.jsx`

Purpose: Application bootstrap.

Responsibilities:

- Render the React root.
- Register global providers such as Redux.
- Register global UI containers such as toast containers.
- Import global CSS.

Forbidden:

- Routes, feature UI, API calls, page-specific logic.

### `src/App.jsx`

Purpose: Root app orchestration.

Responsibilities:

- Initialize auth checks.
- Define public and protected route groups.
- Redirect users based on authentication and role.
- Mount global trackers or app-wide behavior.

Forbidden:

- Feature implementation details, long page markup, direct data-fetching for feature screens.

### `src/AppLayout.jsx`

Purpose: Protected application shell.

Responsibilities:

- Compose sidebar, header, footer, and main content area.
- Manage responsive layout state such as side drawer open/closed behavior.

Forbidden:

- Route definitions, API calls, feature-specific business logic.

### `src/ProtectedLayout.jsx`

Purpose: Guard and wrap protected content.

Responsibilities:

- Decide whether protected pages should render inside the authenticated layout.
- Keep auth layout behavior separate from page components.

Forbidden:

- Complex authorization logic that belongs in route configuration or auth services.

### `src/pages/`

Purpose: Route-level page wrappers.

Responsibilities:

- Represent URL-level screens.
- Compose feature components.
- Handle route-level loaders or skeleton transitions.
- Keep page files short and readable.

Allowed files:

- `homePage.jsx`, `jobsPage.jsx`, `profilePage.jsx`, `dashboardPage.jsx`.

Forbidden:

- Low-level cards, buttons, API helpers, reusable modal internals, global constants.

Example:

```jsx
import { useEffect, useState } from "react";
import PageLoader from "../../components/loader/PageLoader";
import FeatureScreen from "../../components/feature/featureScreen";

export default function FeaturePage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return loading ? <PageLoader /> : <FeatureScreen />;
}
```

### `src/components/`

Purpose: All reusable and feature-specific UI.

Responsibilities:

- Store presentational components, feature containers, modals, loaders, layouts, charts, and reusable visual primitives.

Allowed files:

- React components, component-specific constants, local helper functions that are not reused elsewhere.

Forbidden:

- Redux store configuration, global API instance, route declarations, environment configuration.

Best practices:

- Group feature-specific UI under `components/<feature>/`.
- Put truly shared UI under semantic folders such as `layouts`, `loader`, `modal`, `custom`, or `video`.
- Keep components composable through props.

### `src/components/<feature>/`

Purpose: Feature-specific UI modules.

Responsibilities:

- Contain containers, list views, cards, filters, details panels, and feature-specific subcomponents.

Allowed files:

- `feature.jsx`, `featureListingCard.jsx`, `featureDetails.jsx`, `featureFilter.jsx`.

Forbidden:

- Global endpoint constants, Redux store setup, unrelated shared UI.

Best practices:

- Use a container component for feature orchestration.
- Split repeated UI into cards, filters, detail panels, and modal components.
- Keep API transformation near the feature container or service wrapper.

### `src/components/layouts/`

Purpose: Shared application layout components.

Responsibilities:

- Header, sidebar, footer, side drawer, progress bar, refresh controls, task lists.

Allowed files:

- `AppHeader.jsx`, `AppSidenav.jsx`, `AppFooter.jsx`, `AppSidedrawer.jsx`.

Forbidden:

- Feature-specific cards or modals.

### `src/components/loader/`

Purpose: Loading states and skeletons.

Responsibilities:

- Page-level loader.
- Button loader.
- Feature-specific skeletons.

Allowed files:

- `PageLoader.jsx`, `buttonLoader.jsx`, `jobListingLoader.jsx`, `jobDetailsLoader.jsx`.

Forbidden:

- Data fetching, route guards, domain transformations.

### `src/components/modal/`

Purpose: Dialogs and modal workflows.

Responsibilities:

- Authentication dialogs.
- Feature-specific forms and detail dialogs.
- Upload dialogs, approval dialogs, match dialogs.

Allowed files:

- `loginModal.jsx`, `otpModal.jsx`, `addEntityModal.jsx`, `detailModal.jsx`.

Forbidden:

- Page route wrappers, global store configuration.

Best practices:

- Keep modal open/close state in parent containers unless the modal is fully self-contained.
- Accept callbacks such as `onClose`, `onSubmit`, `onSuccess`.

### `src/landingPage/`

Purpose: Public landing-page experience.

Responsibilities:

- Public marketing or unauthenticated entry UI.
- Landing page sections and public login entry.

Forbidden:

- Protected app layout, authenticated feature pages.

### `src/sections/`

Purpose: Public or reusable page sections.

Responsibilities:

- Hero, footer, navbar, testimonials, contact, project and experience sections.

Best practices:

- Use for section-level composition, especially public pages.
- Avoid mixing protected application feature logic here.

### `src/Services/`

Purpose: API infrastructure and service-level request functions.

Responsibilities:

- Central axios instance.
- Request/response interceptors.
- Endpoint constants.
- API method wrappers.
- Feature-specific API calling modules.

Allowed files:

- `apiService.jsx`, `apiMethod.jsx`, `apiConstant.jsx`, `apiCalling/<feature>Apis.jsx`.

Forbidden:

- JSX UI components, route components, page markup.

### `src/Services/apiCalling/`

Purpose: Feature-level request orchestration.

Responsibilities:

- Call generic API methods.
- Handle `try/catch`.
- Return feature-ready data or `null`.
- Apply small response transformations when necessary.

Forbidden:

- Rendering logic, toast styling, Redux store creation.

### `src/ReduxStore/`

Purpose: Redux store creation.

Responsibilities:

- Configure the root Redux store.
- Register slice reducers.

Allowed files:

- `store.js`.

Forbidden:

- UI components, direct route rendering, endpoint constants.

### `src/ReduxFeature/`

Purpose: Redux slices grouped by feature/state domain.

Responsibilities:

- Slice initial state.
- Reducers and actions.
- Optional selectors and async thunks when required.

Allowed files:

- `authSlice.js`, `taskSlice.jsx`, `entitySlice.js`.

Forbidden:

- React components, CSS, direct axios instance configuration.

### `src/Utlis/`

Purpose: Reusable utilities.

Responsibilities:

- Common form helpers.
- Validators.
- Toast wrappers.
- Activity logging.
- Static data lists.

Allowed files:

- `Common/commonMethod.jsx`, `Common/commonValidator.jsx`, `Toastify/ToastMessage.js`, JSON lookup files.

Forbidden:

- Components with complex UI, route definitions, Redux store setup.

Best practices:

- Keep utilities stateless where possible.
- Prefer pure functions.
- Keep side-effect utilities, such as toast helpers, in their own folder.

### Root Config Files

Purpose: Build, lint, and tooling configuration.

Responsibilities:

- `vite.config.js`: Vite plugins and build setup.
- `eslint.config.js`: lint rules for JavaScript and JSX.
- `tailwind.config.js`: Tailwind configuration.
- `package.json`: scripts and dependencies.

Forbidden:

- Feature implementation logic.

## 3. File Naming Convention

The current project uses mostly `.jsx` for React components and `.js` for non-component helpers. Naming is mixed between PascalCase and camelCase; the reusable standard should preserve intent while making future projects consistent.

Recommended conventions:

| File Type | Convention | Examples |
|---|---|---|
| Page component | camelCase ending with `Page.jsx` | `jobsPage.jsx`, `profilePage.jsx` |
| Feature container | camelCase or PascalCase component file | `jobs.jsx`, `Dashboard.jsx` |
| Reusable component | PascalCase when generic, camelCase when local pattern exists | `PageLoader.jsx`, `customButton.jsx` |
| Card component | camelCase ending with `Card.jsx` | `jobListingCard.jsx`, `ticketListingCard.jsx` |
| Filter component | camelCase ending with `Filter.jsx` or `Filters.jsx` | `jobsFilters.jsx`, `ticketFilter.jsx` |
| Details component | camelCase ending with `Details.jsx` | `jobDetails.jsx`, `panelDetails.jsx` |
| Modal component | camelCase or PascalCase ending with `Modal.jsx` | `loginModal.jsx`, `AddPanelModal.jsx` |
| Loader component | descriptive ending with `Loader.jsx` | `PageLoader.jsx`, `jobListingLoader.jsx` |
| Redux slice | camelCase ending with `Slice.js(x)` | `LoginSlice.js`, `taskSlice.jsx` |
| Store | `store.js` | `ReduxStore/store.js` |
| API constants | `apiConstant.jsx` | `Services/apiConstant.jsx` |
| API methods | `apiMethod.jsx` | `Services/apiMethod.jsx` |
| API service instance | `apiService.jsx` | `Services/apiService.jsx` |
| Feature API wrappers | camelCase ending with `Apis.jsx` | `jobApis.jsx`, `authApis.jsx` |
| Validator | camelCase ending with `Validator.jsx` | `commonValidator.jsx` |
| Utility/helper | camelCase descriptive | `commonMethod.jsx`, `activityLogger.jsx` |
| Toast helper | descriptive action file | `ToastMessage.js` |
| CSS | descriptive CSS file | `index.css`, `CustomToastiy.css` |
| Static JSON | descriptive list name | `skillList.json` |

Rules:

- Component exports should match the primary component name.
- Custom hooks must start with `use`, for example `useAuth.js`, `useDebounce.js`.
- Redux files should describe their state domain, not UI screens.
- API wrapper functions should use action-oriented names, such as `handleGetAllItems`, `handleCreateItem`, `handleUpdateItem`.
- Avoid spaces in filenames.
- Avoid generic names such as `data.jsx`, `helper.jsx`, or `new.jsx`.
- Use one primary component per file.

## 4. API Architecture

API handling must follow the existing `src/Services/` pattern exactly. UI components do not call axios directly and do not build endpoint URLs. Every request flows through the same four service layers.

```text
Component
↓
Services/apiCalling/<feature>Apis.jsx
↓
Services/apiMethod.jsx
↓
Services/apiService.jsx
↓
Services/apiConstant.jsx
↓
Backend
```

Required Services folder:

```text
src/Services/
├── apiConstant.jsx
├── apiMethod.jsx
├── apiService.jsx
└── apiCalling/
    ├── authApis.jsx
    ├── dashboardApis.jsx
    ├── interviewPanel.jsx
    ├── jobApis.jsx
    ├── profileApis.jsx
    ├── referralApis.jsx
    └── sparshApis.jsx
```

### Exact Responsibility Split

| File | Exact Responsibility |
|---|---|
| `apiConstant.jsx` | Holds the API prefix and every endpoint URL or endpoint builder function. |
| `apiService.jsx` | Creates the single axios instance, attaches auth token, normalizes successful responses, handles global API errors, and exports `apiRequest`. |
| `apiMethod.jsx` | Imports `apiConstant` and `apiRequest`, then exposes one named function per backend operation. |
| `apiCalling/<feature>Apis.jsx` | Imports functions from `apiMethod.jsx`, wraps them in `async/try/catch`, checks `response.statusCode`, and returns `response.raw.data` or `null`. |
| UI components | Call only feature handlers from `apiCalling`. Components must not import `apiRequest`, `axios`, `apiMethod`, or endpoint constants. |

### `apiConstant.jsx`

This file is the only place where endpoint paths are assembled.

```jsx
// const apiUserUrlPrefix = `https://align360-backend-prod.joulestowatts.com/api/`
const apiUserUrlPrefix = `http://localhost:3000/api/`

export const apiConstant = {
  getOtp: apiUserUrlPrefix + "auth/sendOtp",
  logIn: apiUserUrlPrefix + "auth/verifyOtp",
  signOut: apiUserUrlPrefix + "auth/signOut",
  getProfile: apiUserUrlPrefix + "user/getProfile",
  getJobs: apiUserUrlPrefix + "job/getAllJobs",
  getJobDetail: (id) => `${apiUserUrlPrefix}job/getJobDetail/${id}`,
  getJobID: apiUserUrlPrefix + "job/getJobDetail/",
  getAllComments: (ticketId) =>
    `${apiUserUrlPrefix}sparsh/allComments?ticketId=${ticketId}`,
};
```

Rules:

- Keep `apiUserUrlPrefix` at the top of the file.
- Export a single object named `apiConstant`.
- Use direct string concatenation for static endpoints.
- Use arrow functions for dynamic endpoints.
- Keep query-string endpoint builders inside `apiConstant`.
- Do not create endpoint URLs inside components.
- Do not create endpoint URLs inside feature API wrappers.
- Use action/entity endpoint names such as `getJobs`, `updateTicket`, `getInterviewDetail`.

Allowed endpoint styles:

```jsx
export const apiConstant = {
  staticEndpoint: apiUserUrlPrefix + "module/action",
  dynamicEndpoint: (id) => `${apiUserUrlPrefix}module/action/${id}`,
  queryEndpoint: (company, dateFrom, dateTo) =>
    `${apiUserUrlPrefix}dashboard/action?company=${company}&startDate=${dateFrom}&endDate=${dateTo}`,
};
```

### `apiService.jsx`

This is the transport layer. It must stay centralized and must export only the clean request function as the default export.

```jsx
import axios from "axios";
import { ErrorMessage } from "../Utlis/Toastify/ToastMessage";
import store from "../ReduxStore/store";
import { logout } from "../ReduxFeature/Authenthicate/LoginSlice";

const ApiRequest = axios.create({
  baseURL: "https://consultant.joulestowatts-uat.com",
  timeout: 20000,
});
```

Rules:

- Create one axios instance named `ApiRequest`.
- Set `timeout` to `20000`.
- Keep auth header logic in the request interceptor.
- Keep global error handling in the response interceptor.
- Do not create additional axios instances for normal API calls.
- Do not duplicate token handling in components or feature API wrappers.

### Request Interceptor

The token is read from local storage and attached as a bearer token.

```jsx
ApiRequest.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

Rules:

- The storage key must be `"token"` to match the auth slice.
- The header must be `Authorization: Bearer <token>`.
- Components must not manually add this token.
- `extraHeaders` may be passed through `apiRequest`, but auth still belongs here.

### Response Interceptor

All successful responses must be normalized before reaching feature code.

```jsx
ApiRequest.interceptors.response.use(
  (response) => {
    return {
      statusCode: response.status || false,
      token: response.data["auth-token"] || null,
      userId: response.data.userId || null,
      message: response.data.message || null,
      raw: response.data
    };
  },
  (error) => {
    const statusCode = error?.response?.status;
    const message = error?.response?.data?.message;
    if (statusCode === 401) {
      localStorage.clear();
      store.dispatch(logout());
      ErrorMessage(message);
    } 
    else if ([403, 404, 422, 500].includes(statusCode)) {
      ErrorMessage(message);
    }
    else if (error.code === "ERR_NETWORK") {
      ErrorMessage("Network Error!! Connection refused error.");
    } else {
      ErrorMessage("Unexpected Error Occurred!");
    }

    return Promise.reject({ statusCode, message, data: null });
  }
);
```

Rules:

- Feature handlers must check `response.statusCode`, not raw axios response fields.
- Feature handlers must use `response.raw` for backend payload data.
- `401` must clear local storage, dispatch `logout()`, and show an error toast.
- `403`, `404`, `422`, and `500` must show the backend message through `ErrorMessage`.
- Network errors must show `"Network Error!! Connection refused error."`.
- Unknown errors must show `"Unexpected Error Occurred!"`.
- Rejected errors must use `{ statusCode, message, data: null }`.

### `apiRequest` Function

Every API method must call this function. Its signature and parameter order are part of the standard.

```jsx
const apiRequest = (
  url,
  method,
  params = {},
  formDataFlag = false,
  extraHeaders = {},
  responseType = "json"
) => {
  return ApiRequest({
    url,  method,  headers: { ...extraHeaders },
    params: method === "Get" && !formDataFlag ? params : null,
    data: formDataFlag || method !== "Get" ? params : null,
    responseType,
  });
};

export default apiRequest;
```

Parameter rules:

| Parameter | Meaning | Default |
|---|---|---|
| `url` | Endpoint from `apiConstant` | required |
| `method` | Request method string | required |
| `params` | Query params, payload, or `FormData` | `{}` |
| `formDataFlag` | Forces payload into `data` even for `Get` | `false` |
| `extraHeaders` | Additional headers | `{}` |
| `responseType` | axios response type | `"json"` |

Important behavior:

- If `method === "Get"` and `formDataFlag` is `false`, `params` are sent as query params.
- If `formDataFlag` is `true`, `params` are sent in `data`.
- If `method !== "Get"`, `params` are sent in `data`.
- `extraHeaders` are merged into request headers.
- `responseType` defaults to `"json"` and can be changed for downloads.

### Method String Rules

The existing project uses method strings such as:

```text
Get
Post
Put
Delete
GET
```

Reusable standard:

- Use `"Get"` for normal GET requests.
- Use `"Post"` for POST requests.
- Use `"Put"` for PUT requests.
- Use `"Delete"` for DELETE requests.
- Avoid lowercase method strings.
- Avoid adding `"GET"` unless matching an existing function that already uses it.

### `apiMethod.jsx`

This file exposes named API functions. Each function should only call `apiRequest` with the correct endpoint, method, params, and `formDataFlag`.

```jsx
import { apiConstant } from "./apiConstant";
import apiRequest from "./apiService";
```

Static GET:

```jsx
export const GetAllJobApi = (params) => {
  return apiRequest(apiConstant.getJobs, "Get", params)
};
```

Dynamic GET:

```jsx
export const GetTicketDetailApi = (id) => {
  return apiRequest(apiConstant.getTicketDetail(id), "Get");
};
```

Dynamic suffix pattern:

```jsx
export const GetJob_IdApi = (jobId) => {
  return apiRequest(`${apiConstant.getJobID}${jobId}`, "Get");
};
```

POST with body:

```jsx
export const CreateEntityApi = (params) => {
  return apiRequest(apiConstant.createEntity, "Post", params, true)
};
```

PUT with body:

```jsx
export const UpdateEntityApi = (params) => {
  return apiRequest(apiConstant.updateEntity, "Put", params, true);
};
```

DELETE with body:

```jsx
export const DeleteEntityApi = (params) => {
  return apiRequest(apiConstant.deleteEntity, "Delete", params, true);
};
```

Rules:

- Export functions directly with `export const`.
- Use action names ending in `Api`, such as `GetProfilePage`, `UpdateImageApi`, `CreateInterviewApi`.
- Keep the function body small.
- Do not add component state, toast logic, or data mapping in this file.
- Do not use `try/catch` here; feature wrappers handle that.
- Use `formDataFlag = true` for POST, PUT, DELETE payloads and any GET that must send data in the body according to the existing pattern.
- Use dynamic endpoint functions from `apiConstant` when available.

### `apiCalling/<feature>Apis.jsx`

Feature API files are the only service files imported by UI components. They convert API methods into feature-ready async functions.

```jsx
import { GetAllJobApi, GetJob_IdApi } from "../apiMethod";

const handleGetAllJobApi = async () => {
  try {
    const response = await GetAllJobApi({ page: 1, limit: 5 });
    if (response.statusCode === 200) {
      return response.raw.data;
    }
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return null;
  }
};

const handleGetJob_IdApi = async (jobId) => {
  try {
    const response = await GetJob_IdApi(jobId);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
  } catch (error) {
    console.error("Error fetching job details:", error);
    return null;
  }
};

export { handleGetAllJobApi, handleGetJob_IdApi };
```

Rules:

- Import only the needed API methods from `../apiMethod`.
- Name feature functions with the `handle` prefix.
- Use `async/await`.
- Wrap each request in `try/catch`.
- Check `response.statusCode === 200` before returning data.
- Return `response.raw.data` for successful data fetches.
- Return `null` in `catch`.
- Log a clear error message in `catch`.
- Export all handlers together at the bottom.
- Keep UI state and JSX out of these files.

### Component Usage

Components call only feature API handlers:

```jsx
import { handleGetAllJobpage } from "../../Services/apiCalling/jobApis";

useEffect(() => {
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await handleGetAllJobpage({ page: 1 });
      const rawJobs = response || [];
      setJobs(rawJobs);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchJobs();
}, []);
```

Component rules:

- Import from `Services/apiCalling/<feature>Apis.jsx`.
- Do not import from `apiMethod.jsx` in UI components.
- Do not import from `apiService.jsx` in UI components.
- Do not import `apiConstant.jsx` in UI components.
- Keep loading state in the component or hook.
- Keep display mapping in the component or a feature helper.
- Always protect rendering with fallback arrays/objects when API returns `null`.

### Loading

Loading is handled by components, not by the service layer.

```jsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await handleGetFeatureData();
      setData(data || []);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);
```

Rules:

- Use local `loading` state for screen-level requests.
- Use feature loaders from `components/loader/`.
- Always call `setLoading(false)` in `finally`.

### Pagination

Pagination is passed as `params` to the API method. For `"Get"` requests with `formDataFlag = false`, `apiRequest` sends those values as query params.

```jsx
export const GetAllEntityApi = (params) => {
  return apiRequest(apiConstant.getEntities, "Get", params)
};

const handleGetAllEntityPage = async (page) => {
  try {
    const response = await GetAllEntityApi({ page });
    if (response.statusCode === 200) {
      return response.raw.data;
    }
  } catch (error) {
    return null;
  }
};
```

Rules:

- Pass pagination as an object.
- Keep default page/limit decisions in the feature API wrapper or component.
- Return only `response.raw.data` to the UI.

### Uploads

Uploads use the same `apiRequest` function and pass `formDataFlag = true`.

```jsx
export const UploadResumeApi = (params) => {
  return apiRequest(apiConstant.uploadResume, "Post", params, true);
};
```

Rules:

- Build `FormData` before calling the API method or feature handler.
- Use `"Post"` or `"Put"` depending on backend behavior.
- Pass `true` as the fourth argument.
- Do not manually configure multipart headers unless the backend requires it.

### Downloads

Downloads are supported by the sixth `apiRequest` argument, `responseType`.

```jsx
export const DownloadReportApi = (params) => {
  return apiRequest(apiConstant.downloadReport, "Get", params, false, {}, "blob");
};
```

Rules:

- Use `responseType = "blob"` for file downloads.
- Keep blob-to-file handling in the feature handler or component.
- Keep the download endpoint in `apiConstant`.

### Success And Failure Handling

Success is not globally toasted by `apiService.jsx`. Feature components or feature handlers decide whether to show a success toast.

Failures are handled in two layers:

```text
apiService.jsx
  shows global toast and rejects standardized error

apiCalling/<feature>Apis.jsx
  catches rejected error, logs context, returns null
```

Rules:

- Use `SuccessMessage` for successful mutations when user feedback is needed.
- Read success messages from `response.message` or `response.raw.message` if needed.
- Do not add success toasts inside the global response interceptor.
- Do not duplicate global status-code toast handling in components.
- Components may still show feature-specific empty/error UI based on `null` or empty data.

### Refresh Token

The exact current Services architecture does not implement refresh-token logic. Future projects that need refresh tokens must add it inside `apiService.jsx` response interceptor while keeping the same public `apiRequest` API.

```text
apiService.jsx response interceptor
↓
on 401, attempt refresh once
↓
retry original request
↓
if refresh fails, localStorage.clear(), dispatch(logout()), ErrorMessage(...)
```

Do not implement refresh-token calls inside components or feature API wrappers.

### API Rules That Must Not Be Broken

- Never call `axios` directly outside `apiService.jsx`.
- Never call `ApiRequest` outside `apiService.jsx`.
- Never import `apiConstant` inside components.
- Never import `apiMethod.jsx` inside components.
- Never put `try/catch` inside `apiMethod.jsx`.
- Never put JSX inside `Services/`.
- Always return `response.raw.data` from successful feature handlers.
- Always return `null` from failed feature handlers.
- Always use `ErrorMessage` from the interceptor for global API failures.
- Always keep the token key as `"token"` unless the auth slice and interceptor are updated together.
- Always keep `currentUser` storage handling inside auth state logic, not API feature files.
- Always use the same `apiRequest(url, method, params, formDataFlag, extraHeaders, responseType)` signature.

### Exact Service Layer Checklist

Before adding any API:

```text
[ ] Endpoint added in apiConstant.jsx.
[ ] Dynamic URL written as an arrow function when it needs params.
[ ] API method added in apiMethod.jsx.
[ ] API method calls apiRequest directly.
[ ] Method string uses existing project casing.
[ ] Payload/body requests pass true as formDataFlag.
[ ] Feature wrapper added under Services/apiCalling/.
[ ] Feature wrapper uses async/await and try/catch.
[ ] Feature wrapper checks response.statusCode === 200.
[ ] Feature wrapper returns response.raw.data.
[ ] Feature wrapper returns null in catch.
[ ] Component imports only from Services/apiCalling/.
```

## 5. Service Layer

The service layer exists to keep components clean and prevent direct dependency on API transport details.

Difference between API layer and service layer:

| Layer | Responsibility |
|---|---|
| `apiConstant.jsx` | Owns `apiUserUrlPrefix` and all endpoint strings/functions. |
| `apiService.jsx` | Owns the single `ApiRequest` axios instance, interceptors, normalized success response, global error toasts, and default `apiRequest` export. |
| `apiMethod.jsx` | Owns one exported API function per backend operation; each function directly returns `apiRequest(...)`. |
| `apiCalling/<feature>Apis.jsx` | Owns feature-level `handle...` functions with `async/await`, `try/catch`, `response.statusCode === 200`, `response.raw.data`, and `null` fallback. |
| Component | Owns UI state, loading, rendering, display mapping, and imports only from `Services/apiCalling/`. |

Flow:

```text
Component event/useEffect
↓
Feature handle function from Services/apiCalling/
↓
Named API method from apiMethod.jsx
↓
Central apiRequest
↓
Axios instance with interceptors
↓
Standardized response
↓
Feature API function extracts data
↓
Component updates local state
```

Best practices:

- Never call `axios` directly in components.
- Never import `apiMethod.jsx`, `apiService.jsx`, or `apiConstant.jsx` in components.
- Never duplicate endpoint strings.
- Never show transport-specific details in UI components.
- Keep `apiMethod.jsx` free of `try/catch`, mapping, toasts, and UI concerns.
- Keep feature API functions small and predictable.
- Return `response.raw.data` on `200`; return `null` on failure.

## 6. State Management

The architecture uses Redux Toolkit for global state and React state for component-local state.

### Global State

Use Redux when state is:

- Required across multiple routes.
- Required by layout and feature components.
- Authentication/session related.
- Long-running task/progress related.
- Needed after page navigation.

Current global patterns:

- `auth`: stores authentication status, token, user, and auth-check completion.
- `task`: stores task id, progress, status, message, and polling state.

### Local State

Use `useState` when state belongs to one component or one feature subtree:

- Loading flags.
- Selected item id.
- Filter inputs.
- Modal open/close state.
- Form fields.
- Current page selection.
- Temporary validation messages.

### Redux Store Template

```js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxFeature/Authenthicate/LoginSlice";
import taskReducer from "../ReduxFeature/task/taskSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    task: taskReducer,
  },
});

export default store;
```

### Slice Template

```js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
  selectedId: null,
  status: "idle",
};

const entitySlice = createSlice({
  name: "entity",
  initialState,
  reducers: {
    setItems: (state, action) => {
      state.items = action.payload;
    },
    selectItem: (state, action) => {
      state.selectedId = action.payload;
    },
    resetEntity: () => initialState,
  },
});

export const { setItems, selectItem, resetEntity } = entitySlice.actions;
export default entitySlice.reducer;
```

### Async Thunks

Use async thunks when API state must be global. Otherwise prefer feature API wrappers and component-local loading.

Template:

```js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { handleGetEntityList } from "../../Services/apiCalling/entityApis";

export const fetchEntities = createAsyncThunk("entity/fetchAll", async () => {
  const data = await handleGetEntityList();
  return data || [];
});
```

### Selectors

Selectors should be added when state access becomes repeated:

```js
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectCurrentUser = (state) => state.auth.user;
```

### RTK Query

RTK Query is not used in the reference architecture. If added in a future project, keep it under `Services/` or `ReduxFeature/<domain>/` and avoid mixing it with manual axios wrappers for the same endpoints.

### When Not To Use Redux

Avoid Redux for:

- One-screen form state.
- Open/close state for local modals.
- Simple selected tab/filter values.
- Derived values that can be calculated from props/state.
- Data that is not shared outside one feature.

## 7. Component Architecture

The project uses feature-based component organization with shared component folders.

Primary component categories:

- Page wrappers: route-level, under `src/pages/`.
- Layout components: app shell, header, sidebar, footer.
- Feature containers: fetch and coordinate a feature screen.
- Presentational components: cards, lists, details panels, filters.
- Shared UI: buttons, loaders, modals, charts, video components.
- Visual primitives: animation, text effects, timeline, orbit, carousel, etc.

### Page vs Feature Component

Page:

```jsx
export default function EntityPage() {
  return <Entity />;
}
```

Feature:

```jsx
export default function Entity() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  return (
    <div>
      {loading ? <EntityLoader /> : <EntityList items={items} />}
    </div>
  );
}
```

### Presentational Component Template

```jsx
export default function EntityCard({ item, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={isSelected ? "border-[#449c8f]" : "border-transparent"}
    >
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </button>
  );
}
```

### Props Pattern

Rules:

- Pass data down through props.
- Pass callbacks up through props.
- Give optional callbacks safe defaults: `onChange = () => {}`.
- Keep prop names action-based: `onClose`, `onSubmit`, `onSelect`, `onSeeMore`.
- Avoid deeply nested prop chains; lift state to the nearest shared parent.

### Composition

Preferred layout:

```jsx
<FeatureToolbar>
  <FeatureFilter />
  <FeatureActions />
</FeatureToolbar>
<FeatureGrid>
  <FeatureList />
  <FeatureDetails />
</FeatureGrid>
```

### Memoization

Use memoization when it prevents meaningful recomputation or rerenders:

- `useMemo` for derived filtered lists.
- `useCallback` for callbacks passed into memoized children.
- `React.memo` for expensive presentational components.

Do not memoize everything by default.

## 8. Hooks Architecture

The reference project mainly uses React built-in hooks directly. Future reusable logic should be extracted into custom hooks when repeated across components.

Rules:

- Custom hook names must start with `use`.
- Hooks should not render JSX.
- Hooks may call services, manage local state, and return data/actions.
- Keep hooks under `src/hooks/` in future projects, or colocate under a feature folder if only one feature uses them.

Recommended folder:

```text
src/
└── hooks/
    ├── useAuth.js
    ├── useDebounce.js
    ├── usePagination.js
    └── useEntityList.js
```

Template:

```js
import { useEffect, useState } from "react";
import { handleGetEntityList } from "../Services/apiCalling/entityApis";

export default function useEntityList(params) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const data = await handleGetEntityList(params);
        setItems(data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [params]);

  return { items, loading, setItems };
}
```

## 9. Routing Architecture

Routing is centralized in `App.jsx` using `BrowserRouter`, `Routes`, `Route`, and `Navigate`.

Patterns:

- Auth is checked once on app startup.
- A full-page loader renders until auth checking completes.
- Public routes render only when unauthenticated.
- Protected routes render only when authenticated.
- Protected screens are wrapped with `ProtectedRoute`.
- Root path redirects authenticated users to a role-appropriate page.

Template:

```jsx
<BrowserRouter>
  <Routes>
    {!isAuthenticated && (
      <>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </>
    )}

    {isAuthenticated && (
      <>
        <Route
          path="/feature"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <FeaturePage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/feature" replace />} />
      </>
    )}
  </Routes>
</BrowserRouter>
```

Lazy loading template:

```jsx
import { lazy, Suspense } from "react";

const FeaturePage = lazy(() => import("./pages/feature/featurePage"));

<Suspense fallback={<PageLoader />}>
  <FeaturePage />
</Suspense>
```

Role-based routing:

```jsx
const getDefaultRoute = (role) => {
  if (role === "Admin") return "/dashboard";
  if (role === "User") return "/home";
  return "/support";
};
```

Role-gated routes wrap the element in a role guard, which sits beside
`ProtectedLayout` rather than inside it — authentication and authorization stay
separate concerns:

```jsx
// AdminRoute.jsx — redirects a non-admin instead of rendering the screen
export default function AdminRoute({ children }) {
  const isAdmin = useSelector(selectIsAdmin);
  if (!isAdmin) return <Navigate to={ROUTES.dashboard} replace />;
  return children;
}

// App.jsx
{
  path: ROUTES.admin,
  element: <AdminRoute><AdminDashboardPage /></AdminRoute>,
}
```

**A client-side role guard is a navigation aid, never a security control.** The API
must enforce the same rule independently — the guard only stops a user landing on
a screen whose every request would 403 anyway. Nav items hide the same way, with
an `adminOnly` flag filtered against the role.

Best practices:

- Keep route paths centralized if the app grows.
- Use `Navigate` for redirects.
- Do auth checks before protected UI renders.
- Avoid data fetching directly inside route declarations.

## 10. Authentication Flow

Authentication is token-based and persisted in local storage.

Current flow:

```text
App mounts
↓
dispatch(checkAuth())
↓
Read token and current user from localStorage
↓
Set auth state in Redux
↓
Render public or protected routes
```

Login flow:

```text
User submits login/OTP form
↓
Call auth API wrapper
↓
Receive token and user payload
↓
dispatch(login({ token, user }))
↓
Store token/currentUser in localStorage
↓
Protected routes become available
```

Logout flow:

```text
User logs out or API returns 401
↓
dispatch(logout())
↓
Remove token/currentUser from localStorage
↓
Public routes become available
```

Auth slice template:

```js
const initialState = {
  isAuthenticated: false,
  token: null,
  user: null,
  isAuthChecked: false,
};
```

Rules:

- Use Redux for auth status.
- Use local storage only for persistence.
- Do not read local storage in every component.
- Attach token through axios request interceptor.
- Clear storage and Redux state on unauthorized responses.

## 11. Error Handling

Error handling is layered.

Global API errors:

- Implemented in axios response interceptor.
- Converts status codes into user-facing toast messages.
- Handles session expiration.

Feature errors:

- Caught inside `Services/apiCalling/<feature>Apis.jsx`.
- Logged to console with meaningful context.
- Return `null`, `[]`, or a stable fallback.

UI errors:

- Show empty states when data is unavailable.
- Keep loaders from getting stuck by using `finally`.
- Show validation messages near inputs.

Toast helpers:

```js
SuccessMessage("Saved successfully.");
ErrorMessage("Something went wrong.");
PromiseToast(promise, {
  pending: "Please wait...",
  success: "Completed.",
  error: "Failed.",
});
```

Recommended error boundary:

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return <PageLoader />;
    }

    return this.props.children;
  }
}
```

## 12. Form Architecture

The reference project uses custom form state and validation helpers.

Patterns:

- Store form data in local component state.
- Use reusable validator functions for common fields.
- Use helper functions for common input updates.
- Submit through feature API wrappers.
- Show validation messages in the form.

Validation helper template:

```js
const commonValidator = (type, value) => {
  if (type === "emailOrPhoneNumber") {
    if (!value) return "Please enter email ID / mobile number.";

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isPhone = /^[0-9]{10}$/.test(value);

    if (!isEmail && !isPhone) {
      return "Please enter a valid email ID or 10-digit mobile number.";
    }
  }

  return "";
};
```

Form submit flow:

```text
User changes input
↓
Local state updates
↓
Validate field or form
↓
Build payload/FormData
↓
Call feature API wrapper
↓
Show success/error toast
↓
Close modal or refresh list
```

When to use a form library:

- Use React Hook Form or Formik when forms become large, deeply validated, or repeated.
- Use Yup or Zod when validation rules become complex or shared with backend schemas.
- Keep validation schemas outside UI markup.

## 13. UI Organization

UI is organized by screen role and reuse level.

Pages:

- Route-level wrappers in `src/pages/`.
- Compose feature components and route-level loaders.

Layouts:

- App shell under `src/components/layouts/`.
- Header/sidebar/footer belong here.

Shared UI:

- Generic controls under `src/components/custom/`.
- Loaders under `src/components/loader/`.
- Video modals under `src/components/video/`.
- Toast helpers under `src/Utlis/Toastify/`.

Feature UI:

- Feature folders under `src/components/<feature>/`.
- Split into list, card, filter, detail, and container components.

Dialogs and modals:

- Global modal category: `src/components/modal/`.
- Feature subfolders for feature-specific dialogs.

Tables, cards, lists:

- Keep each repeated item as a card/list row component.
- Keep parent containers responsible for fetching and selected state.

Empty states:

- Render friendly empty UI when lists are empty.
- Avoid blank screens.

Loading states:

- Use `PageLoader` for route-level loading.
- Use feature-specific skeletons for content loading.
- Use button loaders for pending submissions.

Notifications:

- Use centralized toast helpers.
- Do not call `toast.*` directly throughout the app when a helper exists.

## 14. Styling Architecture

Styling uses Tailwind CSS with global theme tokens and utility classes.

Key patterns:

- `src/index.css` imports Tailwind.
- `@theme` defines reusable colors and animation tokens.
- Common reusable classes use `@apply`.
- Components primarily use Tailwind utility classes inline.
- Custom CSS is used for global behavior, scrollbars, toasts, and reusable class groups.

Theme example:

```css
@import "tailwindcss";

@theme {
  --color-primary: #030412;
  --color-aqua: #33c2cc;
  --color-mint: #57db96;
  --animate-orbit: orbit 50s linear infinite;
}
```

Reusable class example:

```css
.text-heading {
  @apply font-bold text-3xl md:text-4xl;
}
```

Responsive strategy:

- Use Tailwind breakpoints such as `sm:`, `md:`, `lg:`, `xl:`, `2xl:`.
- Use CSS grid for screen layouts.
- Hide complex details panels on smaller screens when needed.
- Use sticky headers and side panels for desktop productivity screens.

Color system:

- Use theme tokens for brand/public visuals.
- Use consistent accent colors for interactive states.
- Avoid hardcoding many one-off colors unless a design exception is intentional.

Typography:

- Use utility classes for headings and body text.
- Keep shared text classes in `index.css` when repeated.

Dark mode:

- Not a core pattern in the reference project.
- If required, implement through Tailwind dark mode classes or theme variables and keep tokens centralized.

SCSS/CSS Modules/Styled Components:

- Not part of the current standard.
- Use only if a future project requires isolated style complexity.

## 14.1 Chart & Reporting Layer

Reporting screens add two folders to the standard structure. They follow the same
rules as every other component folder — no API calls, props in, callbacks out.

```text
src/
├── components/
│   ├── charts/          reusable chart primitives (no domain knowledge)
│   │   ├── lineChart.jsx
│   │   ├── horizontalBars.jsx
│   │   ├── stackedShareBar.jsx
│   │   ├── funnelChart.jsx
│   │   ├── meterBar.jsx
│   │   └── chartLegend.jsx
│   └── admin/           admin feature UI, composed from charts + dataTable
└── constants/
    └── chart.constants.js   the validated palette
```

Rules:

- **Chart primitives stay domain-agnostic.** They take `series` / `rows` / `segments`
  and a formatter. Anything that knows what a "proforma" is belongs in
  `components/admin/`, not `components/charts/`.
- **Colour lives only in `constants/chart.constants.js`.** Never hardcode a hex in
  a chart or a feature component.
- **The palette is validated, not chosen by eye.** It was checked against the app's
  real chart surface (`#ffffff`) before use. Re-run the validator if you change it.
- **Categorical series are capped at three.** A fourth hue fails the
  normal-vision separation floor. A fourth category folds into "Other" or moves
  to a table.
- **One axis per chart.** Never plot two different scales against two y-axes; use
  two charts or index both to a common base.
- **Ordered buckets use the ordinal ramp, not categorical hues.** Ageing buckets
  and funnel stages are ordered magnitudes, so they get one hue light→dark.
- **Status colours are reserved** and always ship with a visible text label.
- **Every chart ships a table view.** `reportCard.jsx` provides the toggle. This is
  required relief for the one fill that sits below 3:1 contrast, and it doubles as
  the accessibility fallback.
- **Two or more series always get a legend**, and lines are also direct-labelled at
  their end point.
- Charts render at measured pixel widths via `useElementWidth`, so stroke weights
  stay true instead of being distorted by a stretched `viewBox`.

## 15. Utility Functions

Utilities live under `src/Utlis/`.

Categories:

- Common form helpers.
- Common validators.
- Toast helpers.
- Activity logging.
- Static JSON lookup data.

Rules:

- Keep generic helpers free of JSX.
- Keep validators deterministic and side-effect free.
- Keep toast side effects inside toast utility files.
- Do not duplicate validation rules in multiple components.

Utility template:

```js
export const setFormInput = (value, field, formData, setFormData) => {
  setFormData({ ...formData, [field]: value });
};
```

Common utility folders for future projects:

```text
src/Utlis/
├── Common/
│   ├── commonMethod.jsx
│   └── commonValidator.jsx
├── Toastify/
│   ├── ToastMessage.js
│   └── CustomToastiy.css
├── dateFormat.js
├── currencyFormat.js
└── storage.js
```

## 16. Constants

Constants should be centralized and grouped by responsibility.

Current constant categories:

- API URLs in `Services/apiConstant.jsx`.
- Static JSON lists in `Utlis/`.
- Route strings currently inline in `App.jsx`.
- Storage keys currently inline in auth slice and API service.

Recommended future structure:

```text
src/constants/
├── api.constants.js
├── route.constants.js
├── role.constants.js
├── storage.constants.js
├── regex.constants.js
└── message.constants.js
```

Examples:

```js
export const STORAGE_KEYS = {
  token: "token",
  currentUser: "currentUser",
};

export const ROUTES = {
  root: "/",
  home: "/home",
  profile: "/profile",
};

export const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[0-9]{10}$/,
};
```

Rules:

- Never duplicate route strings across components.
- Never duplicate storage key strings.
- Keep user-facing messages centralized when repeated.
- Keep API host values in `apiConstant.jsx` and `apiService.jsx` when matching this project exactly; move them to `.env` only as a deliberate production-hardening change.

## 17. Environment Configuration

The current Services implementation keeps API hosts inside `src/Services/apiConstant.jsx` and `src/Services/apiService.jsx`. If a future project must match this project exactly, keep the same shape: `apiUserUrlPrefix` in `apiConstant.jsx` and `baseURL` in `apiService.jsx`.

Current-style API configuration:

```jsx
// apiConstant.jsx
const apiUserUrlPrefix = `http://localhost:3000/api/`

// apiService.jsx
const ApiRequest = axios.create({
  baseURL: "https://consultant.joulestowatts-uat.com",
  timeout: 20000,
});
```

For production hardening, environment-specific values may be moved to `.env`, but the same Services layering must remain unchanged.

Recommended files:

```text
.env
.env.development
.env.staging
.env.production
```

Example:

```text
VITE_API_HOST=https://api.example.com
VITE_API_BASE_URL=https://api.example.com/api
```

Usage:

```js
const apiUserUrlPrefix = import.meta.env.VITE_API_BASE_URL;
```

Rules:

- Vite environment variables must be prefixed with `VITE_`.
- Never commit secrets.
- Browser apps cannot safely store private API secrets.
- If environment variables are introduced, update only `apiConstant.jsx` and `apiService.jsx`.
- Do not let components read API base URLs directly.
- Keep local URLs in `.env.development`.
- Keep production URLs in deployment configuration or `.env.production`.

## 18. Performance Optimization

Current performance patterns:

- Route-level loaders.
- Feature-specific skeletons.
- Responsive hiding of expensive panels on smaller screens.
- Localized state to avoid unnecessary global rerenders.
- Vite build tooling.

Recommended optimizations:

- Lazy-load route components.
- Memoize expensive derived data.
- Debounce filter/search inputs.
- Throttle scroll or resize handlers.
- Use virtualization for very long lists.
- Optimize images and videos in `public/assets`.
- Split heavy chart/3D/animation components with dynamic imports.
- Avoid storing large lists in Redux unless globally needed.

Examples:

```jsx
const filteredItems = useMemo(() => {
  return items.filter((item) => item.name.includes(search));
}, [items, search]);
```

```js
const debounce = (callback, delay = 300) => {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
};
```

## 19. Code Quality Standards

Tooling:

- ESLint with JavaScript, React, React Hooks, and React Refresh plugins.
- Vite for development and production builds.
- Tailwind for styling.

Scripts:

```json
{
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

Rules:

- Run lint before delivery.
- Keep components focused.
- Keep page files thin.
- Keep API calls out of components where possible.
- Keep endpoint strings centralized.
- Prefer named exports for service/API functions.
- Prefer default exports for primary React components.
- Keep comments useful and sparse.
- Remove unused imports and variables.
- Keep import order readable: React, libraries, local modules, styles.

Recommended size limits:

- Page wrapper: under 100 lines.
- Presentational component: under 200 lines.
- Feature container: under 300 lines.
- Utility function: under 50 lines.
- Large components should be split into cards, filters, details, modals, and hooks.

Principles:

- DRY: centralize repeated API, route, validation, and toast logic.
- KISS: prefer simple local state before adding Redux.
- SOLID: keep modules focused on one reason to change.
- Composition: build screens by composing small components.

## 20. Complete Development Workflow

Use this workflow for every new feature:

```text
1. Define route and page responsibility
↓
2. Add endpoint constants
↓
3. Add API method functions
↓
4. Add feature API calling wrapper
↓
5. Decide local state vs Redux
↓
6. Create page wrapper
↓
7. Create feature container
↓
8. Split UI into cards, filters, details, modals, loaders
↓
9. Add validation/helper functions if reusable
↓
10. Add loading, empty, error, and success states
↓
11. Wire route into App.jsx
↓
12. Run lint and build
```

Feature checklist:

- Endpoint added to API constants.
- API method added.
- Feature API wrapper added.
- Page file added under `src/pages/<feature>/`.
- Feature components added under `src/components/<feature>/`.
- Modal files added under `src/components/modal/<feature>/` when needed.
- Loader files added under `src/components/loader/<feature>/` when needed.
- Redux slice added only if state is global.
- Route added to protected or public route group.
- User feedback handled with loaders and toasts.

## 21. Templates

### New Page

```jsx
import Feature from "../../components/feature/feature";

export default function FeaturePage() {
  return <Feature />;
}
```

### New Component

```jsx
export default function FeatureCard({ item, onSelect = () => {} }) {
  return (
    <div className="rounded-lg bg-white p-4 text-gray-900">
      <h3 className="font-semibold">{item.title}</h3>
      <button type="button" onClick={() => onSelect(item.id)}>
        View
      </button>
    </div>
  );
}
```

### New Hook

```js
import { useEffect, useState } from "react";

export default function useAsyncData(fetcher, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        setData(await fetcher());
      } finally {
        setLoading(false);
      }
    };

    run();
  }, dependencies);

  return { data, loading };
}
```

### New Redux Slice

```js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  value: null,
};

const featureSlice = createSlice({
  name: "feature",
  initialState,
  reducers: {
    setValue: (state, action) => {
      state.value = action.payload;
    },
    resetFeature: () => initialState,
  },
});

export const { setValue, resetFeature } = featureSlice.actions;
export default featureSlice.reducer;
```

### New API Constant

```jsx
const apiUserUrlPrefix = `http://localhost:3000/api/`

export const apiConstant = {
  getFeature: apiUserUrlPrefix + "feature/getAll",
  getFeatureDetail: (id) => `${apiUserUrlPrefix}feature/detail/${id}`,
  createFeature: apiUserUrlPrefix + "feature/create",
};
```

### New Service/API Method

```jsx
import { apiConstant } from "./apiConstant";
import apiRequest from "./apiService";

export const GetFeatureApi = (params) => {
  return apiRequest(apiConstant.getFeature, "Get", params)
};

export const GetFeatureDetailApi = (id) => {
  return apiRequest(apiConstant.getFeatureDetail(id), "Get");
};

export const CreateFeatureApi = (params) => {
  return apiRequest(apiConstant.createFeature, "Post", params, true);
};
```

### New Feature API Wrapper

```jsx
import {
  GetFeatureApi,
  GetFeatureDetailApi,
  CreateFeatureApi,
} from "../apiMethod";

const handleGetFeature = async (params) => {
  try {
    const response = await GetFeatureApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
  } catch (error) {
    console.error("Error fetching feature:", error);
    return null;
  }
};

const handleGetFeatureDetail = async (id) => {
  try {
    const response = await GetFeatureDetailApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
  } catch (error) {
    console.error("Error fetching feature detail:", error);
    return null;
  }
};

const handleCreateFeature = async (params) => {
  try {
    const response = await CreateFeatureApi(params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
  } catch (error) {
    console.error("Error creating feature:", error);
    return null;
  }
};

export { handleGetFeature, handleGetFeatureDetail, handleCreateFeature };
```

### New Modal

```jsx
export default function FeatureModal({ open, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 text-gray-900">
        <h2 className="text-lg font-semibold">Modal Title</h2>
        <button type="button" onClick={onClose}>
          Close
        </button>
        <button type="button" onClick={onSubmit}>
          Submit
        </button>
      </div>
    </div>
  );
}
```

### New Table

```jsx
export default function FeatureTable({ rows = [] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### New Form

```jsx
import { useState } from "react";

export default function FeatureForm({ onSubmit }) {
  const [formData, setFormData] = useState({ name: "" });
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError("Name is required.");
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(event) => setFormData({ name: event.target.value })}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

### New Context

```jsx
import { createContext, useContext, useMemo, useState } from "react";

const FeatureContext = createContext(null);

export function FeatureProvider({ children }) {
  const [value, setValue] = useState(null);
  const contextValue = useMemo(() => ({ value, setValue }), [value]);

  return (
    <FeatureContext.Provider value={contextValue}>
      {children}
    </FeatureContext.Provider>
  );
}

export const useFeatureContext = () => useContext(FeatureContext);
```

### New Provider

```jsx
export default function AppProviders({ children }) {
  return children;
}
```

### New Utility

```js
export const formatDisplayDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
};
```

### New Constants

```js
export const FEATURE_STATUS = {
  active: "ACTIVE",
  inactive: "INACTIVE",
};
```

## 22. Best Practices

- Always keep API logic outside UI components.
- Never call `axios` directly inside pages or components.
- Keep endpoint URLs centralized.
- Keep pages thin and feature components focused.
- Keep reusable UI generic.
- Use local state by default.
- Use Redux only for cross-route or app-wide state.
- Standardize API responses before they reach components.
- Use loaders and empty states for every async list/detail screen.
- Use toast helpers for success and error messages.
- Centralize authentication state.
- Attach tokens through request interceptors.
- Clear auth state on unauthorized responses.
- Keep validation reusable.
- Keep file names descriptive.
- Keep modal state in the nearest owning parent.
- Keep layout concerns inside layout components.
- Keep public landing sections separate from protected app features.
- Keep assets organized by purpose.
- Run lint before handoff.

## 23. Things to Avoid

- Avoid direct API calls in components because it couples UI to transport details.
- Avoid duplicated endpoint strings because URLs become difficult to update.
- Avoid putting feature logic in `App.jsx` because routing becomes hard to maintain.
- Avoid putting large UI implementations in page files because pages should compose features.
- Avoid storing local form state in Redux because it increases global complexity.
- Avoid using local storage as the source of truth throughout the app; Redux should represent current auth state.
- Avoid inconsistent API method casing because request helpers become fragile.
- Avoid unhandled loading states because users see blank screens.
- Avoid catching errors without returning a stable fallback.
- Avoid generic file names because they make navigation harder.
- Avoid large components that mix fetching, filtering, rendering, modal logic, and validation.
- Avoid hardcoded environment URLs in production-ready code.
- Avoid duplicating validation regexes in multiple files.
- Avoid placing static assets inside `src` unless they must be bundled.
- Avoid adding new libraries for small tasks already covered by existing utilities.

## 24. Architecture Summary

Use this checklist to recreate the architecture in any React project:

```text
Bootstrap
[ ] Use Vite + React.
[ ] Render Redux Provider and ToastContainer in main.jsx.
[ ] Import global Tailwind CSS once.

Routing
[ ] Keep routes in App.jsx or a dedicated routes module.
[ ] Run auth check before rendering protected routes.
[ ] Split public and protected route groups.
[ ] Use ProtectedLayout/AppLayout for authenticated screens.

Folders
[ ] Put route wrappers in src/pages/.
[ ] Put feature UI in src/components/<feature>/.
[ ] Put chart primitives in src/components/charts/ and the palette in src/constants/.
[ ] Put shared layouts in src/components/layouts/.
[ ] Put loaders in src/components/loader/.
[ ] Put modals in src/components/modal/.
[ ] Put API infrastructure in src/Services/.
[ ] Put Redux store in src/ReduxStore/.
[ ] Put Redux slices in src/ReduxFeature/.
[ ] Put helpers and validators in src/Utlis/.

API
[ ] Store endpoints in apiConstant.jsx.
[ ] Configure axios in apiService.jsx.
[ ] Add request and response interceptors.
[ ] Add named API methods in apiMethod.jsx.
[ ] Add feature wrappers in Services/apiCalling/.
[ ] Return standardized success/failure shapes.

State
[ ] Use local state for screen-only UI.
[ ] Use Redux for auth, task progress, and shared app state.
[ ] Persist only necessary auth/session values.

UI
[ ] Keep pages thin.
[ ] Split feature screens into container, card, filter, detail, modal, and loader components.
[ ] Use Tailwind utilities and shared global classes.
[ ] Provide loading, empty, error, and success states.

Quality
[ ] Keep constants centralized.
[ ] Keep validation reusable.
[ ] Run npm run lint.
[ ] Run npm run build before release.
```

The central rule: each file should have one clear responsibility. Routes choose screens, layouts frame screens, pages compose features, feature components manage UI, services manage API work, Redux manages app-wide state, and utilities hold reusable logic.
