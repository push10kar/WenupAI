import { describe, it, expect } from 'vitest';
import {
  ALLOWED_FIELDS,
  UPDATE_INTENTS,
  CONFIDENCE_LEVELS,
  validateCandidateUpdate,
  safeValidateCandidateUpdate,
  isCandidateUpdate,
  validateCandidateOperation,
  safeValidateCandidateOperation,
  isCandidateOperation,
  createInitialState,
  isPersonalWishesState,
} from '../../src/domain';

describe('Phase 2 — CandidateUpdate Domain Contract', () => {
  describe('Valid Candidate Updates', () => {
    it('validates a single-operation candidate update', () => {
      const update = {
        operations: [
          {
            field: 'fullName',
            value: 'Jane Doe',
            intent: 'NEW',
            confidence: 'CLEAR',
          },
        ],
      };

      const result = validateCandidateUpdate(update);
      expect(result.operations.length).toBe(1);
      expect(result.operations[0].field).toBe('fullName');
      expect(result.operations[0].value).toBe('Jane Doe');
      expect(result.operations[0].intent).toBe('NEW');
      expect(result.operations[0].confidence).toBe('CLEAR');
      // updates alias is also populated
      expect(result.updates.length).toBe(1);
      expect(isCandidateUpdate(update)).toBe(true);
    });

    it('validates a multi-operation candidate update targeting multiple fields', () => {
      const update = {
        operations: [
          {
            field: 'executor.name',
            value: 'James Smith',
            intent: 'NEW',
            confidence: 'CLEAR',
          },
          {
            field: 'executor.relationship',
            value: 'Brother',
            intent: 'NEW',
            confidence: 'CLEAR',
          },
          {
            field: 'hasChildren',
            value: true,
            intent: 'CORRECTION',
            confidence: 'CLEAR',
          },
        ],
      };

      const result = validateCandidateUpdate(update);
      expect(result.operations.length).toBe(3);
      expect(result.operations[0].field).toBe('executor.name');
      expect(result.operations[1].field).toBe('executor.relationship');
      expect(result.operations[2].field).toBe('hasChildren');
    });

    it('validates candidate update using updates key matching architecture.md Section 7.6', () => {
      const extractionResult = {
        updates: [
          {
            field: 'homeAddress',
            value: '42 Park Street, London',
            intent: 'NEW',
            confidence: 'CLEAR',
          },
        ],
      };

      const result = validateCandidateUpdate(extractionResult);
      expect(result.operations.length).toBe(1);
      expect(result.updates.length).toBe(1);
      expect(result.operations[0].value).toBe('42 Park Street, London');
    });

    it('validates every supported operation type', () => {
      for (const intent of UPDATE_INTENTS) {
        const update = {
          operations: [
            {
              field: 'additionalWishes',
              value: 'Scatter ashes in Cornwall',
              intent,
              confidence: 'CLEAR',
            },
          ],
        };

        const result = safeValidateCandidateUpdate(update);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.operations[0].intent).toBe(intent);
        }
      }
    });

    it('validates every supported target field with appropriate value type', () => {
      const testCases: Array<{ field: (typeof ALLOWED_FIELDS)[number]; value: unknown }> = [
        { field: 'fullName', value: 'Arthur Dent' },
        { field: 'homeAddress', value: '155 Country Lane, Cottington' },
        { field: 'coversWorldwideAssets', value: true },
        { field: 'hasChildren', value: false },
        { field: 'children', value: ['Ford Prefect', 'Trillian Astra'] },
        { field: 'executor.name', value: 'Slartibartfast' },
        { field: 'executor.relationship', value: 'Friend' },
        { field: 'specificGifts', value: ['Sub-Etha Sens-O-Matic to Ford'] },
        { field: 'additionalWishes', value: 'Always know where your towel is' },
      ];

      for (const testCase of testCases) {
        const op = {
          field: testCase.field,
          value: testCase.value,
          intent: 'NEW' as const,
          confidence: 'CLEAR' as const,
        };

        expect(isCandidateOperation(op)).toBe(true);
        const update = { operations: [op] };
        expect(isCandidateUpdate(update)).toBe(true);
      }
    });

    it('supports single string values for children and specificGifts', () => {
      const childUpdate = {
        operations: [
          {
            field: 'children',
            value: 'Sarah Smith',
            intent: 'NEW',
            confidence: 'CLEAR',
          },
        ],
      };
      expect(isCandidateUpdate(childUpdate)).toBe(true);

      const giftUpdate = {
        operations: [
          {
            field: 'specificGifts',
            value: 'Vintage watch',
            intent: 'NEW',
            confidence: 'CLEAR',
          },
        ],
      };
      expect(isCandidateUpdate(giftUpdate)).toBe(true);
    });

    it('supports AMBIGUOUS confidence level', () => {
      const update = {
        operations: [
          {
            field: 'coversWorldwideAssets',
            value: true,
            intent: 'CLARIFICATION',
            confidence: 'AMBIGUOUS',
          },
        ],
      };

      const result = validateCandidateUpdate(update);
      expect(result.operations[0].confidence).toBe('AMBIGUOUS');
    });

    it('defaults confidence to CLEAR when omitted', () => {
      const update = {
        operations: [
          {
            field: 'fullName',
            value: 'Jane Doe',
            intent: 'NEW',
          },
        ],
      };

      const result = validateCandidateUpdate(update);
      expect(result.operations[0].confidence).toBe('CLEAR');
    });

    it('accepts operation property as an alias for intent', () => {
      const update = {
        operations: [
          {
            field: 'fullName',
            value: 'Jane Doe',
            operation: 'CORRECTION',
          },
        ],
      };

      const result = validateCandidateUpdate(update);
      expect(result.operations[0].intent).toBe('CORRECTION');
    });
  });

  describe('Invalid Candidate Updates (Rejection Rules)', () => {
    it('rejects missing operations / updates array', () => {
      expect(isCandidateUpdate({})).toBe(false);

      const result = safeValidateCandidateUpdate({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must contain an operations or updates array');
      }
    });

    it('rejects empty operations array (meaningless candidate update)', () => {
      expect(isCandidateUpdate({ operations: [] })).toBe(false);
      expect(isCandidateUpdate({ updates: [] })).toBe(false);

      const result = safeValidateCandidateUpdate({ operations: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot be empty');
      }
    });

    it('rejects unknown operation type', () => {
      const update = {
        operations: [
          {
            field: 'fullName',
            value: 'Jane Doe',
            intent: 'DELETE',
          },
        ],
      };

      expect(isCandidateUpdate(update)).toBe(false);
    });

    it('rejects unknown target fields', () => {
      const unknownFields = ['age', 'salary', 'executor.address', 'assistantMood', 'petName'];
      for (const field of unknownFields) {
        const update = {
          operations: [
            {
              field,
              value: 'something',
              intent: 'NEW',
            },
          ],
        };
        expect(isCandidateUpdate(update)).toBe(false);
      }
    });

    it('rejects malformed operations (non-object, null, primitive)', () => {
      expect(isCandidateUpdate({ operations: [null] })).toBe(false);
      expect(isCandidateUpdate({ operations: ['just a string'] })).toBe(false);
      expect(isCandidateUpdate({ operations: [123] })).toBe(false);
      expect(isCandidateUpdate({ operations: [[]] })).toBe(false);
    });

    it('rejects missing field property in operation', () => {
      const update = {
        operations: [
          {
            value: 'Jane Doe',
            intent: 'NEW',
          },
        ],
      };

      expect(isCandidateUpdate(update)).toBe(false);
    });

    it('rejects missing value property when required', () => {
      const update = {
        operations: [
          {
            field: 'fullName',
            intent: 'NEW',
          },
        ],
      };

      expect(isCandidateUpdate(update)).toBe(false);
    });

    it('rejects invalid value types for boolean fields', () => {
      const invalidBooleans = ['true', 'false', 'yes', 'no', 1, 0, null, {}];

      for (const value of invalidBooleans) {
        const update = {
          operations: [
            {
              field: 'hasChildren',
              value,
              intent: 'NEW',
            },
          ],
        };
        expect(isCandidateUpdate(update)).toBe(false);

        const worldUpdate = {
          operations: [
            {
              field: 'coversWorldwideAssets',
              value,
              intent: 'NEW',
            },
          ],
        };
        expect(isCandidateUpdate(worldUpdate)).toBe(false);
      }
    });

    it('rejects invalid value types for string fields', () => {
      const invalidStrings = [123, true, false, null, {}, []];

      for (const value of invalidStrings) {
        const update = {
          operations: [
            {
              field: 'fullName',
              value,
              intent: 'NEW',
            },
          ],
        };
        expect(isCandidateUpdate(update)).toBe(false);
      }
    });

    it('rejects empty or whitespace-only string values', () => {
      const emptyStrings = ['', '   ', '\t\n'];

      for (const value of emptyStrings) {
        const update = {
          operations: [
            {
              field: 'fullName',
              value,
              intent: 'NEW',
            },
          ],
        };
        expect(isCandidateUpdate(update)).toBe(false);
      }
    });

    it('rejects invalid children array values', () => {
      // Numbers in array
      expect(
        isCandidateUpdate({
          operations: [{ field: 'children', value: [123], intent: 'NEW' }],
        })
      ).toBe(false);

      // Empty strings in array
      expect(
        isCandidateUpdate({
          operations: [{ field: 'children', value: [''], intent: 'NEW' }],
        })
      ).toBe(false);

      // Objects in array
      expect(
        isCandidateUpdate({
          operations: [{ field: 'children', value: [{ name: 'Alice' }], intent: 'NEW' }],
        })
      ).toBe(false);

      // Empty array
      expect(
        isCandidateUpdate({
          operations: [{ field: 'children', value: [], intent: 'NEW' }],
        })
      ).toBe(false);
    });

    it('rejects extra unsupported properties at container level (strict boundary)', () => {
      const update = {
        operations: [
          {
            field: 'fullName',
            value: 'Jane Doe',
            intent: 'NEW',
          },
        ],
        extraProperty: 'not allowed',
      };

      expect(isCandidateUpdate(update)).toBe(false);
    });

    it('rejects extra unsupported properties at operation level (strict boundary)', () => {
      const update = {
        operations: [
          {
            field: 'fullName',
            value: 'Jane Doe',
            intent: 'NEW',
            unsupportedMetadata: 'should fail',
          },
        ],
      };

      expect(isCandidateUpdate(update)).toBe(false);
    });

    it('rejects completely malformed inputs (null, undefined, primitives)', () => {
      expect(isCandidateUpdate(null)).toBe(false);
      expect(isCandidateUpdate(undefined)).toBe(false);
      expect(isCandidateUpdate('operations: []')).toBe(false);
      expect(isCandidateUpdate(12345)).toBe(false);
      expect(isCandidateUpdate(true)).toBe(false);
      expect(isCandidateUpdate([])).toBe(false);
    });

    it('rejects invalid confidence values', () => {
      const update = {
        operations: [
          {
            field: 'fullName',
            value: 'Jane Doe',
            intent: 'NEW',
            confidence: 'SOMEWHAT_SURE',
          },
        ],
      };

      expect(isCandidateUpdate(update)).toBe(false);
    });

    it('throws ZodError on validateCandidateUpdate for malformed input', () => {
      expect(() => validateCandidateUpdate({})).toThrow();
    });
  });

  describe('Distinction between CandidateUpdate and PersonalWishesState', () => {
    it('proves that a valid CandidateUpdate is NOT valid PersonalWishesState', () => {
      const candidateUpdate = {
        operations: [
          {
            field: 'fullName',
            value: 'Jane Doe',
            intent: 'NEW',
            confidence: 'CLEAR',
          },
        ],
      };

      expect(isCandidateUpdate(candidateUpdate)).toBe(true);
      expect(isPersonalWishesState(candidateUpdate)).toBe(false);
    });

    it('proves that PersonalWishesState is NOT a CandidateUpdate', () => {
      const canonicalState = createInitialState();

      expect(isPersonalWishesState(canonicalState)).toBe(true);
      expect(isCandidateUpdate(canonicalState)).toBe(false);
    });
  });
});
