import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./components/RainMap", () => () => (
    <div data-testid="rain-map" />
));

test("renders the rainfall map", () => {
    render(<App />);

    expect(screen.getByTestId("rain-map")).toBeInTheDocument();
});
