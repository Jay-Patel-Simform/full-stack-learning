import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// ! Unmount between tests, or the second test finds two forms in the document
// ! and every getBy* throws "found multiple elements". The error names the
// ! wrong problem, so it costs an hour the first time.
afterEach(cleanup);