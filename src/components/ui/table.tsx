import React from 'react';
import { cn } from '../../utils/cn';

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <table className={cn('w-full text-left text-sm', className)} {...props} />
);

export const TableHead = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-700 dark:text-slate-300', className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('', className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b border-slate-100 transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800', className)} {...props} />
);

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-3 py-3 align-top', className)} {...props} />
);

export const TableHeaderCell = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('px-3 py-3 font-semibold', className)} {...props} />
);
