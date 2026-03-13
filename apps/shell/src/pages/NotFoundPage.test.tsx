import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, afterEach } from "vitest";

import { NotFoundPage } from "./NotFoundPage";

afterEach(cleanup);

describe("NotFoundPage", () => {
  it("renders 'Page not found' heading", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: /page not found/i }),
    ).toBeTruthy();
  });

  it("renders a link back to Home", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /back to home/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute("href")).toBe("/");
  });
});
