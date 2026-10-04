/** Continue until an empty page: the server can cap responses below the requested size. */
export async function collectPages<T>(fetchPage: (offset: number, size: number) => PromiseLike<{ data: T[] | null; error: unknown }>, size = 500): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await fetchPage(rows.length, size);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
  }
}
