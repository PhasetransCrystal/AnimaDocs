import {useMemo, useState, type Key, type ReactNode} from 'react';

import styles from './styles.module.css';

export type SortDirection = 'asc' | 'desc';

export type SortableTableColumn<T extends Record<string, unknown>> = {
  key: keyof T & string;
  label: ReactNode;
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
};

export type SortableTableProps<T extends Record<string, unknown>> = {
  columns: readonly SortableTableColumn<T>[];
  data: readonly T[];
  defaultSort?: {
    key: keyof T & string;
    direction?: SortDirection;
  };
  rowKey?: keyof T & string | ((row: T, index: number) => Key);
  caption?: ReactNode;
  emptyMessage?: ReactNode;
};

type SortState<T extends Record<string, unknown>> = {
  key: keyof T & string;
  direction: SortDirection;
};

function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined || value === '';
}

function comparePresentValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareValues(
  left: unknown,
  right: unknown,
  direction: SortDirection,
): number {
  // Keep empty values at the bottom in either direction.
  const leftMissing = isMissing(left);
  const rightMissing = isMissing(right);

  if (leftMissing || rightMissing) {
    if (leftMissing && rightMissing) {
      return 0;
    }
    return leftMissing ? 1 : -1;
  }

  const result = comparePresentValues(left, right);
  return direction === 'desc' ? -result : result;
}

function getDefaultSort<T extends Record<string, unknown>>(
  columns: readonly SortableTableColumn<T>[],
  defaultSort?: SortableTableProps<T>['defaultSort'],
): SortState<T> | null {
  if (
    defaultSort &&
    columns.some(
      (column) =>
        column.key === defaultSort.key && column.sortable !== false,
    )
  ) {
    return {
      key: defaultSort.key,
      direction: defaultSort.direction ?? 'desc',
    };
  }

  const firstSortableColumn = columns.find(
    (column) => column.sortable !== false,
  );

  return firstSortableColumn
    ? {key: firstSortableColumn.key, direction: 'desc'}
    : null;
}

export default function SortableTable<T extends Record<string, unknown>>({
  columns,
  data,
  defaultSort,
  rowKey,
  caption,
  emptyMessage = '暂无数据',
}: SortableTableProps<T>): ReactNode {
  const [sortState, setSortState] = useState<SortState<T> | null>(() =>
    getDefaultSort(columns, defaultSort),
  );

  const sortedData = useMemo(() => {
    if (!sortState) {
      return [...data];
    }

    const sortColumn = columns.find((column) => column.key === sortState.key);
    if (!sortColumn || sortColumn.sortable === false) {
      return [...data];
    }

    return [...data].sort((left, right) => {
      const leftValue = sortColumn.sortValue
        ? sortColumn.sortValue(left)
        : left[sortColumn.key];
      const rightValue = sortColumn.sortValue
        ? sortColumn.sortValue(right)
        : right[sortColumn.key];

      return compareValues(leftValue, rightValue, sortState.direction);
    });
  }, [columns, data, sortState]);

  function handleSort(key: keyof T & string) {
    setSortState((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'desc' ? 'asc' : 'desc',
        };
      }

      return {key, direction: 'desc'};
    });
  }

  function getRowKey(row: T, index: number): Key {
    if (typeof rowKey === 'function') {
      return rowKey(row, index);
    }

    if (rowKey) {
      const value = row[rowKey];
      if (typeof value === 'string' || typeof value === 'number') {
        return value;
      }
    }

    return index;
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        {caption ? <caption className={styles.caption}>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => {
              const isActive = sortState?.key === column.key;
              const direction = isActive ? sortState.direction : undefined;
              const indicator = direction === 'desc'
                ? '↓'
                : direction === 'asc'
                  ? '↑'
                  : '↕';

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    direction === 'desc'
                      ? 'descending'
                      : direction === 'asc'
                        ? 'ascending'
                        : 'none'
                  }>
                  {column.sortable === false ? (
                    column.label
                  ) : (
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => handleSort(column.key)}
                      title={`按${String(column.label)}排序`}>
                      <span>{column.label}</span>
                      <span className={styles.sortIndicator} aria-hidden="true">
                        {indicator}
                      </span>
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td className={styles.emptyCell} colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => (
              <tr key={getRowKey(row, index)}>
                {columns.map((column) => {
                  const value = row[column.key];
                  return (
                    <td key={column.key}>
                      {column.render ? column.render(value, row) : String(value ?? '')}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
