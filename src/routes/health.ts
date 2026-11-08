export function loader() {
  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
