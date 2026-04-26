import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = '/api/trabajadoreskrsft/planillas';

export function usePlanillasData() {
    // ─── Estado principal ──────────────────────────────────────────────────
    const [planillas,    setPlanillas]    = useState([]);
    const [conceptos,    setConceptos]    = useState([]);
    const [selected,     setSelected]     = useState(null);   // Planilla abierta
    const [boleta,       setBoleta]       = useState(null);   // Boleta trabajador activa
    const [loading,      setLoading]      = useState(false);
    const [calculating,  setCalculating]  = useState(false);
    const [toast,        setToast]        = useState({ show: false, message: '', type: 'success' });

    // Modal crear planilla
    const [showCrearModal,    setShowCrearModal]    = useState(false);
    const [crearForm,         setCrearForm]         = useState({ periodo: '', descripcion: '' });
    const [saving,            setSaving]            = useState(false);

    // Modal boleta
    const [showBoleta,        setShowBoleta]        = useState(false);
    const [boletaTrabajador,  setBoletaTrabajador]  = useState(null);

    // ─── Helpers ────────────────────────────────────────────────────────────
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
    };

    // ─── Fetch ──────────────────────────────────────────────────────────────
    const fetchPlanillas = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(API);
            if (data.success) setPlanillas(data.planillas.data ?? data.planillas);
        } catch (e) {
            showToast('Error cargando planillas.', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchConceptos = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}/conceptos`);
            if (data.success) setConceptos(data.conceptos);
        } catch (_) {}
    }, []);

    const fetchPlanillaDetalle = useCallback(async (id) => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${API}/${id}`);
            if (data.success) setSelected({ ...data.planilla, totales: data.totales });
        } catch (e) {
            showToast('Error cargando planilla.', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlanillas();
        fetchConceptos();
    }, [fetchPlanillas, fetchConceptos]);

    // ─── Crear planilla ─────────────────────────────────────────────────────
    const crearPlanilla = async () => {
        if (!crearForm.periodo) return;
        setSaving(true);
        try {
            await axios.post(API, crearForm);
            showToast('Planilla creada correctamente.');
            setShowCrearModal(false);
            setCrearForm({ periodo: '', descripcion: '' });
            fetchPlanillas();
        } catch (e) {
            const msg = e?.response?.data?.message ?? 'Error al crear planilla.';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ─── Calcular planilla ──────────────────────────────────────────────────
    const calcularPlanilla = async (planillaId, overrides = {}) => {
        setCalculating(true);
        try {
            const { data } = await axios.post(`${API}/${planillaId}/calcular`, { overrides });
            showToast(data.message ?? 'Cálculo completado.');
            // Refrescar detalle
            await fetchPlanillaDetalle(planillaId);
        } catch (e) {
            showToast('Error durante el cálculo.', 'error');
        } finally {
            setCalculating(false);
        }
    };

    // ─── Cambiar estado ─────────────────────────────────────────────────────
    const cambiarEstado = async (planillaId, estado) => {
        try {
            await axios.patch(`${API}/${planillaId}/estado`, { estado });
            showToast(`Planilla marcada como ${estado}.`);
            await fetchPlanillaDetalle(planillaId);
            fetchPlanillas();
        } catch (e) {
            const msg = e?.response?.data?.message ?? 'Transición de estado inválida.';
            showToast(msg, 'error');
        }
    };

    // ─── Ver boleta individual ───────────────────────────────────────────────
    const verBoleta = async (planillaId, trabajadorId, trabajadorNombre) => {
        try {
            const { data } = await axios.get(`${API}/${planillaId}/boleta/${trabajadorId}`);
            if (data.success) {
                setBoleta({ ...data.registro, agrupada: data.boleta_agrupada, nombrePersona: trabajadorNombre });
                setShowBoleta(true);
            }
        } catch (_) {
            showToast('Error cargando boleta.', 'error');
        }
    };

    // ─── Seleccionar planilla de la lista ───────────────────────────────────
    const abrirPlanilla = (planilla) => {
        fetchPlanillaDetalle(planilla.id);
    };

    const cerrarPlanilla = () => {
        setSelected(null);
    };

    return {
        // Data
        planillas, conceptos, selected, boleta,
        // UI State
        loading, calculating, toast,
        showCrearModal, setShowCrearModal,
        crearForm, setCrearForm,
        saving,
        showBoleta, setShowBoleta,
        // Actions
        crearPlanilla,
        calcularPlanilla,
        cambiarEstado,
        verBoleta,
        abrirPlanilla,
        cerrarPlanilla,
        fetchPlanillas,
    };
}
