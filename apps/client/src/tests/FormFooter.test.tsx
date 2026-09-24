import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";

import { FormFooter } from "../components/FormFooter";

const BUTTONS = <button type="button">Save</button>;
const INDICATOR = '[data-slot="form-footer-autosave"]';

/** FormFooter calls useIntl, which requires an IntlProvider ancestor. */
const renderFooter = (ui: ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

afterEach(() => {
  cleanup();
});

describe("FormFooter — autosave indicator", () => {
  it("renders the default status when autosave is not provided", () => {
    const { container } = renderFooter(<FormFooter>{BUTTONS}</FormFooter>);

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(container.querySelector(INDICATOR)).toBeNull();
  });

  it("renders the default status when autosave is disabled", () => {
    const { container } = renderFooter(
      <FormFooter autosave={{ enabled: false, onSave: vi.fn() }}>
        {BUTTONS}
      </FormFooter>,
    );

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(container.querySelector(INDICATOR)).toBeNull();
  });

  it("shows the green dot + saved time when enabled with lastSaved", () => {
    const savedAt = new Date(2026, 0, 15, 10, 24, 0);
    const { container } = renderFooter(
      <FormFooter
        autosave={{ enabled: true, lastSaved: savedAt, onSave: vi.fn() }}
      >
        {BUTTONS}
      </FormFooter>,
    );

    const indicator = container.querySelector(INDICATOR);
    expect(indicator).toBeInTheDocument();
    // Locale suffix (e.g. " AM") varies — assert on the HH:MM part.
    expect(screen.getByText(/Saved 10:24/)).toBeInTheDocument();
    // Green dot: solid success core inside the success-tinted halo.
    expect(indicator?.querySelector(".bg-success")).toBeInTheDocument();
  });

  it("shows the pending label when enabled but never saved", () => {
    const { container } = renderFooter(
      <FormFooter autosave={{ enabled: true, onSave: vi.fn() }}>
        {BUTTONS}
      </FormFooter>,
    );

    expect(container.querySelector(INDICATOR)).toBeInTheDocument();
    expect(screen.getByText("Autosave on")).toBeInTheDocument();
    expect(container.querySelector(`${INDICATOR} .bg-success`)).toBeNull();
  });

  it("keeps an explicit status prop over the autosave indicator", () => {
    const { container } = renderFooter(
      <FormFooter
        status="Custom status"
        autosave={{ enabled: true, lastSaved: new Date(), onSave: vi.fn() }}
      >
        {BUTTONS}
      </FormFooter>,
    );

    expect(screen.getByText("Custom status")).toBeInTheDocument();
    expect(container.querySelector(INDICATOR)).toBeNull();
  });

  it("updates the displayed timestamp when lastSaved changes", () => {
    const onSave = vi.fn();
    const { rerender } = renderFooter(
      <FormFooter
        autosave={{
          enabled: true,
          lastSaved: new Date(2026, 0, 15, 10, 24, 0),
          onSave,
        }}
      >
        {BUTTONS}
      </FormFooter>,
    );

    expect(screen.getByText(/Saved 10:24/)).toBeInTheDocument();

    rerender(
      <IntlProvider locale="en">
        <FormFooter
          autosave={{
            enabled: true,
            lastSaved: new Date(2026, 0, 15, 11, 5, 0),
            onSave,
          }}
        >
          {BUTTONS}
        </FormFooter>
      </IntlProvider>,
    );

    expect(screen.getByText(/Saved 11:05/)).toBeInTheDocument();
    expect(screen.queryByText(/Saved 10:24/)).toBeNull();
  });
});

describe("FormFooter — autosave debounce (1.5s)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not save before 1.5s and fires once after", () => {
    const onSave = vi.fn();
    renderFooter(
      <FormFooter autosave={{ enabled: true, onSave }}>{BUTTONS}</FormFooter>,
    );

    act(() => {
      vi.advanceTimersByTime(1499);
    });
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("does not save when autosave is disabled", () => {
    const onSave = vi.fn();
    renderFooter(
      <FormFooter autosave={{ enabled: false, onSave }}>{BUTTONS}</FormFooter>,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("re-arms the debounce when a new onSave callback arrives", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderFooter(
      <FormFooter autosave={{ enabled: true, onSave: first }}>
        {BUTTONS}
      </FormFooter>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Parent recreated the callback (form values changed) — timer restarts.
    rerender(
      <IntlProvider locale="en">
        <FormFooter autosave={{ enabled: true, onSave: second }}>
          {BUTTONS}
        </FormFooter>
      </IntlProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does not re-arm when the autosave object is recreated with the same onSave", () => {
    const onSave = vi.fn();
    const { rerender } = renderFooter(
      <FormFooter autosave={{ enabled: true, onSave }}>{BUTTONS}</FormFooter>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // New autosave object (e.g. lastSaved arrived), same callback identity —
    // the pending debounce must not restart.
    rerender(
      <IntlProvider locale="en">
        <FormFooter
          autosave={{ enabled: true, lastSaved: new Date(), onSave }}
        >
          {BUTTONS}
        </FormFooter>
      </IntlProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(501);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending save when autosave is disabled mid-flight", () => {
    const onSave = vi.fn();
    const { rerender } = renderFooter(
      <FormFooter autosave={{ enabled: true, onSave }}>{BUTTONS}</FormFooter>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    rerender(
      <IntlProvider locale="en">
        <FormFooter autosave={{ enabled: false, onSave }}>{BUTTONS}</FormFooter>
      </IntlProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  it("cancels the pending save on unmount", () => {
    const onSave = vi.fn();
    const { unmount } = renderFooter(
      <FormFooter autosave={{ enabled: true, onSave }}>{BUTTONS}</FormFooter>,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onSave).not.toHaveBeenCalled();
  });
});
