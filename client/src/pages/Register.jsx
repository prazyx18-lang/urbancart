import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../api/client.js';
import { ErrorBox } from '../components/Status.jsx';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.password !== form.confirm) local.confirm = 'Passwords do not match';
    if (Object.keys(local).length) return setErrors(local);
    setErrors({});
    setError('');
    setBusy(true);
    try {
      const { confirm, ...payload } = form;
      await register(payload);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.details || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (k, label, type = 'text') => (
    <label className="field">{label}
      <input type={type} value={form[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} />
      {errors[k] && <span className="field-error">{errors[k]}</span>}
    </label>
  );

  return (
    <div className="container auth-wrap">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h1>Create your account</h1>
        <ErrorBox message={error} />
        {field('name', 'Full name')}
        {field('email', 'Email', 'email')}
        {field('phone', 'Phone (optional)', 'tel')}
        {field('password', 'Password (min 8 characters)', 'password')}
        {field('confirm', 'Confirm password', 'password')}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Register'}</button>
        <p className="muted small center">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
