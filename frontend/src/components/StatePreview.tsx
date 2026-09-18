import React from "react";
import { PersonalWishesState, FieldStatus, Field } from "../types";

interface StatePreviewProps {
  state: PersonalWishesState;
}

const formatStatus = (status: FieldStatus): string => {
  switch (status) {
    case "CONFIRMED":
      return "Confirmed";
    case "UNCONFIRMED":
    case "CONFLICTED":
      return "Needs clarification";
    case "UNKNOWN":
    default:
      return "Not provided";
  }
};

const getStatusBadgeClass = (status: FieldStatus): string => {
  switch (status) {
    case "CONFIRMED":
      return "badge-confirmed";
    case "UNCONFIRMED":
    case "CONFLICTED":
      return "badge-warning";
    case "UNKNOWN":
    default:
      return "badge-unknown";
  }
};

interface FieldItemProps<T> {
  label: string;
  field: Field<T>;
  renderValue?: (val: T) => string;
}

function FieldItem<T>({ label, field, renderValue }: FieldItemProps<T>) {
  const displayValue =
    field.value !== null && field.value !== undefined
      ? renderValue
        ? renderValue(field.value)
        : String(field.value)
      : "—";

  return (
    <li className="state-field-row">
      <div className="state-field-info">
        <span className="state-field-label">{label}</span>
        <span className="state-field-value">{displayValue}</span>
      </div>
      <span className={`status-badge ${getStatusBadgeClass(field.status)}`}>
        {formatStatus(field.status)}
      </span>
    </li>
  );
}

export const StatePreview: React.FC<StatePreviewProps> = ({ state }) => {
  return (
    <div className="state-preview-panel">
      <h3 className="panel-title">Collected Information</h3>

      <div className="state-sections">
        {/* Section 1: Personal Info */}
        <section className="state-section">
          <h4 className="state-section-title">Personal Details</h4>
          <ul className="state-field-list">
            <FieldItem label="Full Name" field={state.fullName} />
            <FieldItem label="Home Address" field={state.homeAddress} />
            <FieldItem
              label="Worldwide Assets"
              field={state.coversWorldwideAssets}
              renderValue={(v) => (v ? "Yes" : "No")}
            />
          </ul>
        </section>

        {/* Section 2: Family */}
        <section className="state-section">
          <h4 className="state-section-title">Family & Children</h4>
          <ul className="state-field-list">
            <FieldItem
              label="Has Children"
              field={state.hasChildren}
              renderValue={(v) => (v ? "Yes" : "No")}
            />
            {state.hasChildren.value && state.children.length > 0 && (
              <li className="state-field-row state-subfield">
                <div className="state-field-info">
                  <span className="state-field-label">Children Names</span>
                  <span className="state-field-value">
                    {state.children
                      .map((c) => c.value)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </span>
                </div>
              </li>
            )}
          </ul>
        </section>

        {/* Section 3: Executor */}
        <section className="state-section">
          <h4 className="state-section-title">Executor Designation</h4>
          <ul className="state-field-list">
            <FieldItem label="Executor Name" field={state.executor.name} />
            <FieldItem
              label="Relationship"
              field={state.executor.relationship}
            />
          </ul>
        </section>

        {/* Section 4: Wishes & Gifts */}
        <section className="state-section">
          <h4 className="state-section-title">Wishes & Specific Gifts</h4>
          <ul className="state-field-list">
            {state.specificGifts.length > 0 && (
              <li className="state-field-row">
                <div className="state-field-info">
                  <span className="state-field-label">Specific Gifts</span>
                  <span className="state-field-value">
                    {state.specificGifts
                      .map((g) => g.value)
                      .filter(Boolean)
                      .join("; ")}
                  </span>
                </div>
              </li>
            )}
            <FieldItem
              label="Additional Wishes"
              field={state.additionalWishes}
            />
          </ul>
        </section>
      </div>
    </div>
  );
};
