import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import { ModuleSkeleton } from "./ModuleSkeleton";

afterEach(cleanup);

describe("ModuleSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<ModuleSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("contains skeleton elements (not a spinner)", () => {
    render(<ModuleSkeleton />);
    // Skeleton from @hexalith/ui renders with role="status"
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("has accessible loading indicator", () => {
    render(<ModuleSkeleton />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
  });
});
