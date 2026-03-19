// Contract test helpers — import from '@hexalith/cqrs-client/testing'
// These import vitest and must NOT be in the main bundle.
export {
  commandBusContractTests,
  TEST_COMMAND,
} from "./mocks/__contracts__/commandBus.contract.test";
export {
  queryBusContractTests,
  TEST_QUERY,
} from "./mocks/__contracts__/queryBus.contract.test";
