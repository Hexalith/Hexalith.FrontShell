# API Quick Reference

Complete export catalog for the three Hexalith frontend packages. For interactive component documentation, run `pnpm storybook` (or `pnpm -F @hexalith/ui storybook`).

> **AI-assisted generation:** For structured hook API reference, component catalog with props, and usage examples optimized for AI consumption, see the [AI Knowledge Bundle](./ai-knowledge-bundle/index.md).

## @hexalith/shell-api

### Auth

| Export              | Type      | Description                                           |
| ------------------- | --------- | ----------------------------------------------------- |
| `AuthProvider`      | Component | Provides authentication context to the component tree |
| `AuthProviderProps` | Type      | Props for `AuthProvider`                              |
| `useAuth`           | Hook      | Access current auth state (user, login, logout)       |

### Tenant

| Export                | Type      | Description                                   |
| --------------------- | --------- | --------------------------------------------- |
| `TenantProvider`      | Component | Provides tenant context to the component tree |
| `TenantProviderProps` | Type      | Props for `TenantProvider`                    |
| `useTenant`           | Hook      | Access active tenant and tenant switching     |

### Theme

| Export               | Type      | Description                         |
| -------------------- | --------- | ----------------------------------- |
| `ThemeProvider`      | Component | Provides theme context (light/dark) |
| `ThemeProviderProps` | Type      | Props for `ThemeProvider`           |
| `useTheme`           | Hook      | Access and toggle current theme     |

### Connection Health

| Export                     | Type      | Description                           |
| -------------------------- | --------- | ------------------------------------- |
| `ConnectionHealthProvider` | Component | Provides connection health monitoring |
| `useConnectionHealth`      | Hook      | Access connection health state        |

### Form Dirty

| Export              | Type      | Description                                   |
| ------------------- | --------- | --------------------------------------------- |
| `FormDirtyProvider` | Component | Tracks unsaved form changes                   |
| `useFormDirty`      | Hook      | Access form dirty state for navigation guards |

### Locale

| Export                | Type      | Description                    |
| --------------------- | --------- | ------------------------------ |
| `LocaleProvider`      | Component | Provides locale/i18n context   |
| `LocaleProviderProps` | Type      | Props for `LocaleProvider`     |
| `useLocale`           | Hook      | Access current locale settings |

### Manifest

| Export                     | Type     | Description                                                  |
| -------------------------- | -------- | ------------------------------------------------------------ |
| `ModuleManifest`           | Type     | Union type of all manifest versions                          |
| `ModuleManifestV1`         | Type     | V1 manifest schema                                           |
| `ModuleRoute`              | Type     | Route declaration (`{ path }`)                               |
| `ModuleNavigation`         | Type     | Navigation entry (label, path, icon, category)               |
| `validateManifest`         | Function | Runtime manifest validation — returns errors or valid result |
| `ManifestValidationResult` | Type     | Return type of `validateManifest`                            |
| `ManifestValidationError`  | Type     | Individual validation error with field and message           |

### Core Types

| Export                         | Type | Description                        |
| ------------------------------ | ---- | ---------------------------------- |
| `AuthContextValue`             | Type | Shape of auth context              |
| `AuthUser`                     | Type | Authenticated user object          |
| `ConnectionHealth`             | Type | Connection health status           |
| `ConnectionHealthContextValue` | Type | Shape of connection health context |
| `FormDirtyContextValue`        | Type | Shape of form dirty context        |
| `TenantContextValue`           | Type | Shape of tenant context            |
| `ThemeContextValue`            | Type | Shape of theme context             |
| `LocaleContextValue`           | Type | Shape of locale context            |
| `Theme`                        | Type | Theme variant (light/dark)         |

### Testing

| Export                              | Type      | Description                                                |
| ----------------------------------- | --------- | ---------------------------------------------------------- |
| `MockShellProvider`                 | Component | Test wrapper providing all shell contexts with mock values |
| `MockShellProviderProps`            | Type      | Props for `MockShellProvider`                              |
| `createMockAuthContext`             | Function  | Creates mock auth context for tests                        |
| `createMockTenantContext`           | Function  | Creates mock tenant context for tests                      |
| `createMockConnectionHealthContext` | Function  | Creates mock connection health context for tests           |
| `createMockFormDirtyContext`        | Function  | Creates mock form dirty context for tests                  |

---

## @hexalith/cqrs-client

### Provider

| Export              | Type      | Description                                                    |
| ------------------- | --------- | -------------------------------------------------------------- |
| `CqrsProvider`      | Component | Provides CQRS infrastructure (command bus, query bus, SignalR) |
| `CqrsProviderProps` | Type      | Props for `CqrsProvider`                                       |
| `useCqrs`           | Hook      | Access CQRS provider context                                   |

### Commands

| Export               | Type | Description                                                             |
| -------------------- | ---- | ----------------------------------------------------------------------- |
| `useSubmitCommand`   | Hook | Fire-and-forget command submission                                      |
| `useCommandPipeline` | Hook | Full command lifecycle with status polling                              |
| `useCommandStatus`   | Hook | Poll status of an existing command                                      |
| `SubmitCommandInput` | Type | Command input shape (`commandType`, `domain`, `aggregateId`, `payload`) |
| `PipelineStatus`     | Type | Command pipeline status union                                           |

### Command Events

| Export                  | Type | Description                            |
| ----------------------- | ---- | -------------------------------------- |
| `CommandCompletedEvent` | Type | Event emitted when a command completes |
| `CommandEventBus`       | Type | Event bus for command lifecycle events |

### Queries

| Export           | Type      | Description                                                   |
| ---------------- | --------- | ------------------------------------------------------------- |
| `useQuery`       | Hook      | Query projection data with Zod schema validation              |
| `QueryProvider`  | Component | Query context provider                                        |
| `QueryParams`    | Type      | Query parameter shape (`domain`, `queryType`, `aggregateId?`) |
| `QueryOptions`   | Type      | Query options (e.g., `enabled`)                               |
| `UseQueryResult` | Type      | Return type of `useQuery`                                     |

### Connection

| Export               | Type | Description                     |
| -------------------- | ---- | ------------------------------- |
| `useConnectionState` | Hook | Access SignalR connection state |
| `ConnectionState`    | Type | Connection state shape          |
| `TransportType`      | Type | SignalR transport type          |

### SignalR

| Export                      | Type      | Description                               |
| --------------------------- | --------- | ----------------------------------------- |
| `SignalRHub`                | Class     | SignalR hub connection manager            |
| `SignalRProvider`           | Component | Provides SignalR hub to component tree    |
| `SignalRProviderProps`      | Type      | Props for `SignalRProvider`               |
| `useSignalRHub`             | Hook      | Access SignalR hub instance               |
| `useProjectionSubscription` | Hook      | Subscribe to real-time projection changes |

### Validation

| Export                    | Type | Description                                           |
| ------------------------- | ---- | ----------------------------------------------------- |
| `useCanExecuteCommand`    | Hook | Pre-flight check: can current user execute a command? |
| `useCanExecuteQuery`      | Hook | Pre-flight check: can current user execute a query?   |
| `CanExecuteCommandParams` | Type | Params for `useCanExecuteCommand`                     |
| `CanExecuteQueryParams`   | Type | Params for `useCanExecuteQuery`                       |
| `UseCanExecuteResult`     | Type | Return type of pre-flight hooks                       |

### Errors

| Export                 | Type  | Description              |
| ---------------------- | ----- | ------------------------ |
| `HexalithError`        | Class | Abstract base error      |
| `ApiError`             | Class | HTTP errors from backend |
| `AuthError`            | Class | 401 Unauthorized         |
| `ForbiddenError`       | Class | 403 Forbidden            |
| `RateLimitError`       | Class | 429 Too Many Requests    |
| `ValidationError`      | Class | Zod validation failures  |
| `CommandRejectedError` | Class | Domain rule rejection    |
| `CommandTimeoutError`  | Class | Command polling timeout  |

### Types

| Export                      | Type | Description                                |
| --------------------------- | ---- | ------------------------------------------ |
| `CommandStatus`             | Type | Command status union                       |
| `CommandStatusResponse`     | Type | Backend command status response shape      |
| `ProblemDetails`            | Type | RFC 7807 problem details                   |
| `PreflightValidationResult` | Type | Pre-flight authorization response          |
| `SubmitCommandRequest`      | Type | HTTP request shape for command submission  |
| `SubmitCommandResponse`     | Type | HTTP response shape for command submission |
| `SubmitQueryRequest`        | Type | HTTP request shape for query               |
| `SubmitQueryResponse`       | Type | HTTP response shape for query              |
| `ValidateCommandRequest`    | Type | HTTP request shape for command validation  |
| `ValidateQueryRequest`      | Type | HTTP request shape for query validation    |
| `ICommandBus`               | Type | Command bus interface                      |
| `IQueryBus`                 | Type | Query bus interface                        |

### UI Utilities

| Export                  | Type     | Description                                          |
| ----------------------- | -------- | ---------------------------------------------------- |
| `generateCorrelationId` | Function | Generate a unique correlation ID for request tracing |
| `CORRELATION_ID_HEADER` | Constant | HTTP header name for correlation ID                  |
| `parseProblemDetails`   | Function | Parse RFC 7807 problem details from error responses  |

### Mocks

| Export                 | Type  | Description                                    |
| ---------------------- | ----- | ---------------------------------------------- |
| `MockCommandBus`       | Class | In-memory command bus for testing and dev host |
| `MockCommandBusConfig` | Type  | Configuration for `MockCommandBus`             |
| `MockSendBehavior`     | Type  | Mock send behavior (`"success"`, `"rejected"`) |
| `MockQueryBus`         | Class | In-memory query bus for testing and dev host   |
| `MockQueryBusConfig`   | Type  | Configuration for `MockQueryBus`               |
| `MockSignalRHub`       | Class | In-memory SignalR hub for testing and dev host |
| `ISignalRHub`          | Type  | SignalR hub interface                          |

---

## @hexalith/ui

### Layout

| Export            | Type      | Description                                              |
| ----------------- | --------- | -------------------------------------------------------- |
| `PageLayout`      | Component | Page-level layout with title, subtitle, and action slots |
| `PageLayoutProps` | Type      | Props for `PageLayout`                                   |
| `Stack`           | Component | Vertical stack layout with spacing                       |
| `StackProps`      | Type      | Props for `Stack`                                        |
| `Inline`          | Component | Horizontal inline layout with spacing                    |
| `InlineProps`     | Type      | Props for `Inline`                                       |
| `Divider`         | Component | Horizontal divider line                                  |
| `DividerProps`    | Type      | Props for `Divider`                                      |
| `SpacingScale`    | Type      | Spacing scale values                                     |

### Forms

| Export              | Type      | Description                                          |
| ------------------- | --------- | ---------------------------------------------------- |
| `Button`            | Component | Button with variant, size, and loading state         |
| `ButtonProps`       | Type      | Props for `Button`                                   |
| `Input`             | Component | Text input with label, validation, and error display |
| `InputProps`        | Type      | Props for `Input`                                    |
| `Select`            | Component | Dropdown select with option groups                   |
| `SelectProps`       | Type      | Props for `Select`                                   |
| `SelectOption`      | Type      | Single select option                                 |
| `SelectOptionGroup` | Type      | Grouped select options                               |
| `TextArea`          | Component | Multi-line text input                                |
| `TextAreaProps`     | Type      | Props for `TextArea`                                 |
| `Checkbox`          | Component | Checkbox with label                                  |
| `CheckboxProps`     | Type      | Props for `Checkbox`                                 |
| `Form`              | Component | Form with Zod schema validation                      |
| `FormProps`         | Type      | Props for `Form`                                     |
| `FormField`         | Component | Form field wrapper connecting inputs to form state   |
| `FormFieldProps`    | Type      | Props for `FormField`                                |
| `useFormStatus`     | Hook      | Access form submission status                        |
| `DatePicker`        | Component | Date picker input                                    |
| `DatePickerProps`   | Type      | Props for `DatePicker`                               |

### Feedback

| Export               | Type      | Description                                            |
| -------------------- | --------- | ------------------------------------------------------ |
| `ToastProvider`      | Component | Provides toast notification context                    |
| `ToastProviderProps` | Type      | Props for `ToastProvider`                              |
| `useToast`           | Hook      | Show toast notifications                               |
| `ToastOptions`       | Type      | Toast configuration options                            |
| `Skeleton`           | Component | Loading placeholder with variant (table, card, detail) |
| `SkeletonProps`      | Type      | Props for `Skeleton`                                   |
| `EmptyState`         | Component | Empty state with title, description, and action        |
| `EmptyStateProps`    | Type      | Props for `EmptyState`                                 |
| `EmptyStateAction`   | Type      | Action button for empty state                          |
| `ErrorDisplay`       | Component | Error display with optional retry action               |
| `ErrorDisplayProps`  | Type      | Props for `ErrorDisplay`                               |
| `ErrorBoundary`      | Component | React error boundary for catching render errors        |
| `ErrorBoundaryProps` | Type      | Props for `ErrorBoundary`                              |

### Navigation

| Export           | Type      | Description                                |
| ---------------- | --------- | ------------------------------------------ |
| `Sidebar`        | Component | Sidebar navigation with collapsible groups |
| `SidebarProps`   | Type      | Props for `Sidebar`                        |
| `NavigationItem` | Type      | Sidebar navigation item                    |
| `Tabs`           | Component | Tab navigation                             |
| `TabsProps`      | Type      | Props for `Tabs`                           |
| `TabItem`        | Type      | Tab item                                   |

### Overlay

| Export                  | Type      | Description                                         |
| ----------------------- | --------- | --------------------------------------------------- |
| `Tooltip`               | Component | Hover tooltip                                       |
| `TooltipProps`          | Type      | Props for `Tooltip`                                 |
| `Modal`                 | Component | Modal dialog                                        |
| `ModalProps`            | Type      | Props for `Modal`                                   |
| `AlertDialog`           | Component | Confirmation dialog with destructive action support |
| `AlertDialogProps`      | Type      | Props for `AlertDialog`                             |
| `DropdownMenu`          | Component | Dropdown menu with items and groups                 |
| `DropdownMenuProps`     | Type      | Props for `DropdownMenu`                            |
| `DropdownMenuItem`      | Type      | Menu item                                           |
| `DropdownMenuSeparator` | Type      | Menu separator                                      |
| `DropdownMenuGroup`     | Type      | Menu item group                                     |
| `Popover`               | Component | Popover content anchored to a trigger               |
| `PopoverProps`          | Type      | Props for `Popover`                                 |

### Data Display

| Export             | Type      | Description                                                |
| ------------------ | --------- | ---------------------------------------------------------- |
| `Table`            | Component | Data table with sorting, filtering, pagination, and search |
| `TableProps`       | Type      | Props for `Table`                                          |
| `TableColumn`      | Type      | Column definition                                          |
| `TableFilterState` | Type      | Filter state                                               |
| `DetailView`       | Component | Structured detail display with sections and fields         |
| `DetailViewProps`  | Type      | Props for `DetailView`                                     |
| `DetailSection`    | Type      | Detail view section                                        |
| `DetailField`      | Type      | Detail view field                                          |

### Utilities

| Export                      | Type     | Description                                           |
| --------------------------- | -------- | ----------------------------------------------------- |
| `computeComplianceScore`    | Function | Compute accessibility compliance score                |
| `contrastRatio`             | Function | Calculate WCAG contrast ratio between two colors      |
| `relativeLuminance`         | Function | Calculate relative luminance of a color               |
| `hexToRgb`                  | Function | Convert hex color to RGB                              |
| `validateContrastMatrix`    | Function | Validate contrast ratios across a color matrix        |
| `validateThemeContrast`     | Function | Validate theme colors meet WCAG contrast requirements |
| `validateFocusRingContrast` | Function | Validate focus ring visibility                        |
| `lightTheme`                | Constant | Default light theme color definitions                 |
| `darkTheme`                 | Constant | Default dark theme color definitions                  |
| `ThemeColors`               | Type     | Theme color definitions type                          |
| `ContrastResult`            | Type     | Contrast validation result                            |
