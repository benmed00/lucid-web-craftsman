/**
 * AdminDataTable — unit + integration tests.
 *
 * Couvre :
 *  - États loading / error / empty
 *  - Rendu des colonnes + tri (asc → desc → none) sur colonnes triables
 *  - Sélection de ligne (surlignage + onRowClick)
 *  - Pagination interne (itemsPerPage) et contrôlée (onPageChange)
 *  - Tri initial (initialSort)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AdminDataTable,
  type AdminDataTableColumn,
} from '@/components/admin/AdminDataTable';

interface Row {
  id: number;
  name: string;
  price: number;
}

const rows: Row[] = [
  { id: 1, name: 'Beta', price: 20 },
  { id: 2, name: 'Alpha', price: 30 },
  { id: 3, name: 'Gamma', price: 10 },
];

const columns: AdminDataTableColumn<Row>[] = [
  {
    id: 'name',
    header: 'Nom',
    sortAccessor: (r) => r.name.toLowerCase(),
    cell: (r) => <span data-testid={`name-${r.id}`}>{r.name}</span>,
  },
  {
    id: 'price',
    header: 'Prix',
    sortAccessor: (r) => r.price,
    cell: (r) => <span>{r.price}</span>,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: (r) => <button type="button">Edit {r.id}</button>,
  },
];

function getBodyRows() {
  // Skip the table header row.
  return screen
    .getAllByRole('row')
    .slice(1)
    .filter((r) => within(r).queryAllByRole('cell').length > 0);
}

describe('AdminDataTable — states', () => {
  it('renders skeletons when isLoading is true and no rows', () => {
    const { container } = render(
      <AdminDataTable
        data={[]}
        columns={columns}
        getRowId={(r) => r.id}
        isLoading
        loadingRowCount={4}
      />
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders an error message with a working retry button', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <AdminDataTable
        data={[]}
        columns={columns}
        getRowId={(r) => r.id}
        error={new Error('boom')}
        onRetry={onRetry}
      />
    );
    expect(
      screen.getByText(/impossible de charger les données/i)
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /réessayer/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty message when data is empty and not loading', () => {
    render(
      <AdminDataTable
        data={[]}
        columns={columns}
        getRowId={(r) => r.id}
        emptyMessage="Aucun produit"
      />
    );
    expect(screen.getByText('Aucun produit')).toBeInTheDocument();
  });
});

describe('AdminDataTable — rendering & columns', () => {
  it('renders all headers and one row per data entry', () => {
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
      />
    );
    expect(screen.getByRole('columnheader', { name: /nom/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /prix/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    expect(getBodyRows()).toHaveLength(rows.length);
  });

  it('does not render a sort button on non-sortable headers', () => {
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
      />
    );
    const actionsHeader = screen.getByRole('columnheader', { name: /actions/i });
    expect(within(actionsHeader).queryByRole('button')).toBeNull();
  });
});

describe('AdminDataTable — sorting', () => {
  it('cycles asc → desc → none when clicking a sortable header', async () => {
    const user = userEvent.setup();
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
      />
    );
    const nameHeader = screen.getByRole('columnheader', { name: /nom/i });
    const btn = within(nameHeader).getByRole('button');

    // Initial order = insertion order
    expect(getBodyRows().map((r) => r.textContent)).toEqual([
      expect.stringContaining('Beta'),
      expect.stringContaining('Alpha'),
      expect.stringContaining('Gamma'),
    ]);

    // asc
    await user.click(btn);
    expect(
      getBodyRows().map((r) => within(r).getByText(/Alpha|Beta|Gamma/).textContent)
    ).toEqual(['Alpha', 'Beta', 'Gamma']);

    // desc
    await user.click(btn);
    expect(
      getBodyRows().map((r) => within(r).getByText(/Alpha|Beta|Gamma/).textContent)
    ).toEqual(['Gamma', 'Beta', 'Alpha']);

    // none → original order restored
    await user.click(btn);
    expect(
      getBodyRows().map((r) => within(r).getByText(/Alpha|Beta|Gamma/).textContent)
    ).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  it('sorts numerically for numeric accessors', async () => {
    const user = userEvent.setup();
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
      />
    );
    const priceHeader = screen.getByRole('columnheader', { name: /prix/i });
    await user.click(within(priceHeader).getByRole('button')); // asc
    const priceCells = getBodyRows().map((r) =>
      within(r).getAllByRole('cell')[1].textContent
    );
    expect(priceCells).toEqual(['10', '20', '30']);
  });

  it('applies initialSort on mount', () => {
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ columnId: 'name', direction: 'asc' }}
      />
    );
    expect(
      getBodyRows().map((r) => within(r).getByText(/Alpha|Beta|Gamma/).textContent)
    ).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});

describe('AdminDataTable — selection', () => {
  it('applies the selected class to the matching row', () => {
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        selectedRowId={2}
      />
    );
    const selected = screen.getByTestId('name-2').closest('tr');
    expect(selected).toHaveClass('bg-muted');
  });

  it('invokes onRowClick with the row when a row is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={onRowClick}
      />
    );
    await user.click(screen.getByTestId('name-3'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[2]);
  });
});

describe('AdminDataTable — pagination', () => {
  it('paginates internally when itemsPerPage is provided', () => {
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        pagination={{ mode: 'internal', itemsPerPage: 2 }}
      />
    );
    expect(getBodyRows()).toHaveLength(2);
    // Total count is rendered by TablePagination
    expect(screen.getByText(/sur 3/i)).toBeInTheDocument();
  });

  it('does not render a pagination bar when internal pagination is disabled', () => {
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        pagination={{ mode: 'internal', enabled: false }}
      />
    );
    expect(getBodyRows()).toHaveLength(3);
    expect(screen.queryByText(/sur 3/i)).toBeNull();
  });

  it('forwards controlled pagination and calls onPageChange on next', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onItemsPerPageChange = vi.fn();
    render(
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        pagination={{
          mode: 'controlled',
          currentPage: 1,
          totalPages: 3,
          startIndex: 0,
          endIndex: 1,
          totalItems: 6,
          itemsPerPage: 2,
          onPageChange,
          onItemsPerPageChange,
        }}
      />
    );
    // In controlled mode, all provided rows are rendered as-is.
    expect(getBodyRows()).toHaveLength(3);
    expect(screen.getByText(/sur 6/i)).toBeInTheDocument();

    const next = screen.getByRole('link', { name: /page suivante/i });
    await user.click(next);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
