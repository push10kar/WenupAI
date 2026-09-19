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
    case "REFUSED":
      return "Refused";
    case "NOT_PROVIDED":
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
    case "REFUSED":
    case "NOT_PROVIDED":
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
    <li className="state-field-row flex items-center justify-between py-2 border-b border-[#4E1FBE]/10 last:border-b-0">
      <div className="state-field-info flex flex-col">
        <span className="state-field-label text-xs font-semibold text-[#494454]">
          {label}
        </span>
        <span className="state-field-value text-xs font-medium text-[#1D1A23] mt-0.5">
          {displayValue}
        </span>
      </div>
      <span className={`status-badge ${getStatusBadgeClass(field.status)}`}>
        {formatStatus(field.status)}
      </span>
    </li>
  );
}

export const StatePreview: React.FC<StatePreviewProps> = ({ state }) => {
  return (
    <div className="state-preview-panel flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="panel-title text-sm font-bold text-[#1D1A23]">
          Collected Information
        </h3>
        <span className="text-[10px] font-mono text-[#797482]">
          Canonical State Tree
        </span>
      </div>

      <div className="state-sections flex flex-col gap-3">
        {/* Section 1: Personal Info */}
        <section className="state-section p-3.5 rounded-xl border border-[#4E1FBE]/15 bg-[#FCF6EE]/30">
          <h4 className="state-section-title text-[11px] font-bold text-[#4E1FBE] uppercase tracking-wider mb-2">
            Personal Details
          </h4>
          <ul className="state-field-list flex flex-col">
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
        <section className="state-section p-3.5 rounded-xl border border-[#4E1FBE]/15 bg-[#FCF6EE]/30">
          <h4 className="state-section-title text-[11px] font-bold text-[#4E1FBE] uppercase tracking-wider mb-2">
            Family & Children
          </h4>
          <ul className="state-field-list flex flex-col">
            <FieldItem
              label="Has Children"
              field={state.hasChildren}
              renderValue={(v) => (v ? "Yes" : "No")}
            />
            {state.childrenCount &&
              state.childrenCount.status !== "UNKNOWN" && (
                <FieldItem
                  label="Children Count"
                  field={state.childrenCount}
                  renderValue={(v) => (v !== null ? String(v) : "—")}
                />
              )}
            {state.hasChildren.value && state.children.length > 0 && (
              <li className="state-field-row state-subfield flex items-center justify-between py-2 border-b border-[#4E1FBE]/10 last:border-b-0">
                <div className="state-field-info flex flex-col">
                  <span className="state-field-label text-xs font-semibold text-[#494454]">
                    Children Names
                  </span>
                  <span className="state-field-value text-xs font-medium text-[#1D1A23] mt-0.5">
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
        <section className="state-section p-3.5 rounded-xl border border-[#4E1FBE]/15 bg-[#FCF6EE]/30">
          <h4 className="state-section-title text-[11px] font-bold text-[#4E1FBE] uppercase tracking-wider mb-2">
            Executor Designation
          </h4>
          <ul className="state-field-list flex flex-col">
            <FieldItem label="Executor Name" field={state.executor.name} />
            <FieldItem
              label="Relationship"
              field={state.executor.relationship}
            />
          </ul>
        </section>

        {/* Section 4: Wishes & Gifts */}
        <section className="state-section p-3.5 rounded-xl border border-[#4E1FBE]/15 bg-[#FCF6EE]/30">
          <h4 className="state-section-title text-[11px] font-bold text-[#4E1FBE] uppercase tracking-wider mb-2">
            Wishes & Specific Gifts
          </h4>
          <ul className="state-field-list flex flex-col">
            {state.specificGifts.length > 0 && (
              <li className="state-field-row flex items-center justify-between py-2 border-b border-[#4E1FBE]/10">
                <div className="state-field-info flex flex-col">
                  <span className="state-field-label text-xs font-semibold text-[#494454]">
                    Specific Gifts
                  </span>
                  <span className="state-field-value text-xs font-medium text-[#1D1A23] mt-0.5">
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
