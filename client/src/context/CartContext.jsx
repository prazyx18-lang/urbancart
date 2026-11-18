import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

// Cart lives on the server for logged-in customers, so prices are always re-checked at checkout.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return setCart({ items: [], subtotal: 0 });
    setLoading(true);
    try {
      setCart(await api('/cart'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const run = (promise) => promise.then((data) => { setCart(data); return data; });
  const addItem = (productId, quantity = 1) => run(api('/cart', { method: 'POST', body: { productId, quantity } }));
  const updateQty = (productId, quantity) => run(api(`/cart/${productId}`, { method: 'PATCH', body: { quantity } }));
  const removeItem = (productId) => run(api(`/cart/${productId}`, { method: 'DELETE' }));

  const count = cart.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, count, loading, refresh, addItem, updateQty, removeItem }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
