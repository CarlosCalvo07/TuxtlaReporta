/* eslint-disable @typescript-eslint/no-require-imports */
import { render, screen, cleanup } from "@testing-library/react-native";
import Home from "../app/index";
let mockRole: string | null = null;
let mockLoading = false;
jest.mock("../src/session", () => ({
  useSession: () => ({
    role: mockRole,
    loading: mockLoading,
    recovery: false,
    message: "",
  }),
}));
jest.mock("../src/backend", () => ({ api: { auth: { password: jest.fn() } } }));
jest.mock("../src/Auth", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "LOGIN");
});
jest.mock("../src/Citizen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "REPORTAR");
});
jest.mock("../src/Operations", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "OPERACIONES");
});
afterEach(cleanup);
beforeEach(() => {
  mockLoading = false;
  mockRole = null;
});
test("does not mount another role while session is loading", () => {
  mockLoading = true;
  mockRole = "admin";
  render(<Home />);
  expect(screen.queryByText("OPERACIONES")).toBeNull();
  expect(screen.getByText("Verificando sesión…")).toBeTruthy();
});
test("a citizen goes directly to reporting", () => {
  mockRole = "citizen";
  render(<Home />);
  expect(screen.getByText("REPORTAR")).toBeTruthy();
  expect(screen.queryByText("OPERACIONES")).toBeNull();
});
test.each(["admin", "maintenance"])(
  "%s opens operational navigation",
  (role) => {
    mockRole = role;
    render(<Home />);
    expect(screen.getByText("OPERACIONES")).toBeTruthy();
    expect(screen.queryByText("REPORTAR")).toBeNull();
  },
);
test("an unauthenticated user only sees login", () => {
  render(<Home />);
  expect(screen.getByText("LOGIN")).toBeTruthy();
});
