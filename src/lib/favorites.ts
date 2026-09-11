const FAVORITES_STORAGE_KEY = "shehara_favorites_v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function readFavorites(): string[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      FAVORITES_STORAGE_KEY,
    );

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  if (!canUseStorage()) {
    return;
  }

  try {
    const uniqueIds = Array.from(
      new Set(
        ids.filter(
          (id) =>
            typeof id === "string" &&
            id.trim().length > 0,
        ),
      ),
    );

    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(uniqueIds),
    );

    window.dispatchEvent(
      new CustomEvent("shehara:favorites-changed"),
    );
  } catch {
    // التخزين المحلي قد يكون غير متاح في بعض أوضاع الخصوصية.
  }
}

export function getFavoriteIds(): string[] {
  return readFavorites();
}

export function isFavorite(productId: string): boolean {
  if (!productId) {
    return false;
  }

  return readFavorites().includes(productId);
}

export function addFavorite(productId: string): boolean {
  if (!productId) {
    return false;
  }

  const current = readFavorites();

  if (current.includes(productId)) {
    return true;
  }

  writeFavorites([
    ...current,
    productId,
  ]);

  return true;
}

export function removeFavorite(
  productId: string,
): boolean {
  if (!productId) {
    return false;
  }

  const current = readFavorites();

  writeFavorites(
    current.filter(
      (id) => id !== productId,
    ),
  );

  return true;
}

export function toggleFavorite(
  productId: string,
): boolean {
  if (!productId) {
    return false;
  }

  const current = readFavorites();

  const exists = current.includes(
    productId,
  );

  if (exists) {
    writeFavorites(
      current.filter(
        (id) => id !== productId,
      ),
    );

    return false;
  }

  writeFavorites([
    ...current,
    productId,
  ]);

  return true;
}
