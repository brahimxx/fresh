"use client";

import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Virtualized table component for rendering large lists efficiently
 * Only renders visible rows in the viewport
 * 
 * @param {Array} data - Array of data objects to render
 * @param {Array} columns - Array of column definitions { header: string, accessor: string | function, cell: function }
 * @param {number} estimateSize - Estimated row height in pixels (default: 60)
 * @param {number} overscan - Number of items to render outside viewport (default: 5)
 */
export function VirtualizedTable({ 
  data = [], 
  columns = [], 
  estimateSize = 60,
  overscan = 5,
  onRowClick
}) {
  var parentRef = useRef(null);

  var rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: overscan,
  });

  var virtualItems = rowVirtualizer.getVirtualItems();
  var totalSize = rowVirtualizer.getTotalSize();

  var paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  var paddingBottom = virtualItems.length > 0 
    ? totalSize - virtualItems[virtualItems.length - 1].end 
    : 0;

  return (
    <div 
      ref={parentRef} 
      className="border rounded-lg overflow-auto"
      style={{ 
        height: "600px",
        contain: "strict",
      }}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            {columns.map(function(column, idx) {
              return (
                <TableHead key={idx} className={column.className}>
                  {column.header}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop + "px" }} />
            </tr>
          )}
          {virtualItems.map(function(virtualRow) {
            var row = data[virtualRow.index];
            if (!row) return null;

            return (
              <TableRow
                key={virtualRow.key}
                data-index={virtualRow.index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : ""}
                style={{
                  height: virtualRow.size + "px",
                }}
              >
                {columns.map(function(column, colIdx) {
                  var value;
                  if (typeof column.accessor === "function") {
                    value = column.accessor(row);
                  } else {
                    value = row[column.accessor];
                  }

                  return (
                    <TableCell key={colIdx} className={column.cellClassName}>
                      {column.cell ? column.cell(row, value) : value}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom + "px" }} />
            </tr>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
