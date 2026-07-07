import { useState } from 'react';

export default function HelloIsland() {
  const [count, setCount] = useState(0);

  return (
    <button
      type="button"
      onClick={() => setCount((c) => c + 1)}
      className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
      data-testid="hello-island-button"
    >
      React-Island aktiv — Klicks: {count}
    </button>
  );
}
