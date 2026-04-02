import { useState, useEffect, ChangeEvent } from 'react';
import { 
  Activity, 
  Calendar, 
  FileText, 
  Plus, 
  TrendingUp, 
  User, 
  ChevronRight,
  Clock,
  ClipboardList,
  Image as ImageIcon,
  CheckCircle2,
  Circle,
  Pill,
  Droplets,
  AlertCircle,
  X,
  Save,
  Loader2,
  Thermometer,
  Download,
  Camera,
  Bell,
  History,
  MessageSquare,
  Tag,
  Briefcase,
  Search,
  Check,
  Sparkles
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { ChemoSession, BloodCount, Exam, Patient, Prescription, TumorMetric, Symptom, MedicationLog, Question, GalleryImage, MedicalLeave } from './types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // States for real data
  const [patient, setPatient] = useState<Patient | null>(null);
  const [chemoSessions, setChemoSessions] = useState<ChemoSession[]>([]);
  const [bloodCounts, setBloodCounts] = useState<BloodCount[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [metrics, setMetrics] = useState<TumorMetric[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [medicalLeaves, setMedicalLeaves] = useState<MedicalLeave[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  // Form States
  const [showForm, setShowForm] = useState<'none' | 'chemo' | 'exam' | 'blood' | 'pill' | 'symptom' | 'scanner' | 'question' | 'leave' | 'gallery'>('none');
  const [newChemo, setNewChemo] = useState({ tipo: 'Vermelha', ciclo: 1, total: 4, data: format(new Date(), 'yyyy-MM-dd') });
  const [newExam, setNewExam] = useState({ tipo: '', data: format(new Date(), 'yyyy-MM-dd'), medico: '', birads: '' });
  const [newBlood, setNewBlood] = useState({ data: format(new Date(), 'yyyy-MM-dd'), leucocitos: 4500, hemoglobina: 12, plaquetas: 250000 });
  const [newPill, setNewPill] = useState({ medicamento: '', dosagem: '', frequencia: '' });
  const [newSymptom, setNewSymptom] = useState({ sintoma: 'Fadiga', intensidade: 5, notas: '' });
  const [newDoc, setNewDoc] = useState<{ tipo: string; data: string; file: File | null; category?: 'laudo' | 'receita' | 'atestado'; dias?: number; medico?: string }>({ tipo: '', data: format(new Date(), 'yyyy-MM-dd'), file: null });
  const [newQuestion, setNewQuestion] = useState({ pergunta: '' });
  const [newLeave, setNewLeave] = useState({ data_inicio: format(new Date(), 'yyyy-MM-dd'), dias: 15, medico: '' });
  const [newGallery, setNewGallery] = useState<{ categoria: string; tags: string; file: File | null }>({ categoria: 'Evolução', tags: '', file: null });
  const [uploading, setUploading] = useState(false);
  const [selectedExamType, setSelectedExamType] = useState('Todos');
  const [aiClassifying, setAiClassifying] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchData() {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const [pRes, cRes, bRes, eRes, mRes, prRes, sRes, mlRes, qRes, lRes, gRes] = await Promise.all([
        supabase.from('patients').select('*').limit(1).maybeSingle(),
        supabase.from('chemo_sessions').select('*').order('data_prevista', { ascending: true }),
        supabase.from('blood_counts').select('*').order('data_exame', { ascending: true }),
        supabase.from('exams_and_documents').select('*').order('data_exame', { ascending: false }),
        supabase.from('tumor_metrics').select('*').order('data_medicao', { ascending: true }),
        supabase.from('prescriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('symptoms').select('*').order('data_registro', { ascending: false }),
        supabase.from('medication_logs').select('*').order('data_tomada', { ascending: false }),
        supabase.from('questions_and_answers').select('*').order('data_criacao', { ascending: false }),
        supabase.from('medical_leaves').select('*').order('data_inicio', { ascending: false }),
        supabase.from('treatment_gallery').select('*').order('data_registro', { ascending: false })
      ]);

      if (pRes.data) setPatient(pRes.data);
      if (cRes.data) setChemoSessions(cRes.data);
      if (bRes.data) setBloodCounts(bRes.data);
      if (eRes.data) setExams(eRes.data);
      if (mRes.data) setMetrics(mRes.data);
      if (prRes.data) setPrescriptions(prRes.data);
      if (sRes.data) setSymptoms(sRes.data);
      if (mlRes.data) setMedicationLogs(mlRes.data);
      if (qRes.data) setQuestions(qRes.data);
      if (lRes.data) setMedicalLeaves(lRes.data);
      if (gRes.data) setGalleryImages(gRes.data);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function getUserId() {
    if (!isSupabaseConfigured) return '00000000-0000-0000-0000-000000000000';
    const { data } = await supabase.auth.getUser();
    return data.user?.id || '00000000-0000-0000-0000-000000000000';
  }

  async function handleAddChemo() {
    if (!isSupabaseConfigured) {
      alert('Supabase não configurado. Adicione as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nos segredos.');
      return;
    }
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('chemo_sessions').insert([{
        tipo: newChemo.tipo,
        ciclo_atual: newChemo.ciclo,
        total_ciclos: newChemo.total,
        data_prevista: newChemo.data,
        user_id: userId
      }]);

      if (error) throw error;
      closeModal();
      fetchData();
    } catch (error) {
      alert('Erro ao salvar. Verifique a configuração do Supabase.');
      console.error(error);
    }
  }

  async function handleAddExam() {
    if (!isSupabaseConfigured) return;
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('exams_and_documents').insert([{
        tipo_documento: newExam.tipo,
        data_exame: newExam.data,
        medico_responsavel: newExam.medico,
        birads_categoria: newExam.birads,
        user_id: userId
      }]);

      if (error) throw error;
      closeModal();
      fetchData();
    } catch (error) {
      alert('Erro ao salvar exame.');
      console.error(error);
    }
  }

  async function handleAddBlood() {
    if (!isSupabaseConfigured) return;
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('blood_counts').insert([{
        data_exame: newBlood.data,
        leucocitos: newBlood.leucocitos,
        hemoglobina: newBlood.hemoglobina,
        plaquetas: newBlood.plaquetas,
        user_id: userId
      }]);

      if (error) throw error;
      closeModal();
      fetchData();
    } catch (error) {
      alert('Erro ao salvar hemograma.');
      console.error(error);
    }
  }

  async function handleAddPill() {
    if (!isSupabaseConfigured) return;
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('prescriptions').insert([{
        medicamento: newPill.medicamento,
        dosagem: newPill.dosagem,
        frequencia: newPill.frequencia,
        user_id: userId
      }]);

      if (error) throw error;
      closeModal();
      fetchData();
    } catch (error) {
      alert('Erro ao salvar medicamento.');
      console.error(error);
    }
  }

  async function handleAddSymptom() {
    if (!isSupabaseConfigured) return;
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('symptoms').insert([{
        sintoma: newSymptom.sintoma,
        intensidade: newSymptom.intensidade,
        notas: newSymptom.notas,
        user_id: userId
      }]);

      if (error) throw error;
      closeModal();
      fetchData();
    } catch (error) {
      alert('Erro ao salvar sintoma.');
      console.error(error);
    }
  }

  async function classifyDocument(file: File): Promise<{ category: 'laudo' | 'receita' | 'atestado', tipo: string, data?: string, dias?: number, medico?: string }> {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Analise este documento médico e extraia as seguintes informações em JSON: \n1. category: 'laudo' (exames, biópsias), 'receita' (prescrições) ou 'atestado' (licenças).\n2. tipo: Nome do exame ou medicamento principal.\n3. data: Data do documento (YYYY-MM-DD).\n4. dias: Se for atestado, número de dias de repouso.\n5. medico: Nome do médico ou clínica se visível." },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, enum: ['laudo', 'receita', 'atestado'] },
              tipo: { type: Type.STRING },
              data: { type: Type.STRING },
              dias: { type: Type.NUMBER },
              medico: { type: Type.STRING }
            },
            required: ['category', 'tipo']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return result;
    } catch (error) {
      console.error("AI Classification error:", error);
      return { category: 'laudo', tipo: 'Documento Digitalizado' };
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    
    setNewDoc(prev => ({ ...prev, file }));
    setAiClassifying(true);
    
    try {
      const classification = await classifyDocument(file);
      setNewDoc(prev => ({
        ...prev,
        tipo: classification.tipo || prev.tipo,
        data: classification.data || prev.data,
        category: classification.category,
        dias: classification.dias,
        medico: classification.medico
      }));
    } catch (error) {
      console.error("Error classifying file:", error);
    } finally {
      setAiClassifying(false);
    }
  }

  async function handleUploadDoc() {
    if (!isSupabaseConfigured || !newDoc.file) return;
    setUploading(true);
    try {
      const userId = await getUserId();
      const category = newDoc.category || 'laudo';

      const fileExt = newDoc.file.name.split('.').pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;
      const filePath = `${category}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, newDoc.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      const docData = newDoc.data;
      const docTipo = newDoc.tipo || 'Documento Digitalizado';
      const docMedico = newDoc.medico || 'Não identificado';

      let dbError;
      if (category === 'laudo') {
        const { error } = await supabase.from('exams_and_documents').insert([{
          tipo_documento: docTipo,
          data_exame: docData,
          medico_responsavel: docMedico,
          arquivo_url: publicUrl,
          user_id: userId
        }]);
        dbError = error;
      } else if (category === 'receita') {
        const { error } = await supabase.from('prescriptions').insert([{
          medicamento: docTipo,
          data_inicio: docData,
          arquivo_url: publicUrl,
          user_id: userId
        }]);
        dbError = error;
      } else if (category === 'atestado') {
        const { error } = await supabase.from('medical_leaves').insert([{
          medico_atestado: docMedico,
          data_inicio: docData,
          dias_concedidos: newDoc.dias || 1,
          user_id: userId
        }]);
        dbError = error;
      }

      if (dbError) throw dbError;

      closeModal();
      fetchData();
    } catch (error) {
      alert('Erro ao fazer upload do documento.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  async function logMedication(prescriptionId: string) {
    if (!isSupabaseConfigured) return;
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('medication_logs').insert([{
        prescription_id: prescriptionId,
        user_id: userId
      }]);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error logging medication:', error);
    }
  }

  function generatePDFReport() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.text('Relatório Médico Consolidado', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 28, { align: 'center' });

    // Patient Info
    doc.setFontSize(14);
    doc.text('Informações do Paciente', 14, 40);
    doc.setFontSize(10);
    doc.text(`Diagnóstico: ${patient?.diagnostico_patologico || 'N/A'}`, 14, 48);
    doc.text(`CID: ${patient?.cid_principal || 'N/A'}`, 14, 54);

    // Symptoms Table
    doc.setFontSize(14);
    doc.text('Diário de Sintomas (Últimos registros)', 14, 70);
    autoTable(doc, {
      startY: 75,
      head: [['Data', 'Sintoma', 'Intensidade', 'Notas']],
      body: symptoms.slice(0, 10).map(s => [
        format(parseISO(s.data_registro), 'dd/MM/yyyy'),
        s.sintoma,
        s.intensidade.toString(),
        s.notas || '-'
      ]),
    });

    // Medications Table
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(14);
    doc.text('Medicamentos Atuais', 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Medicamento', 'Dosagem', 'Frequência']],
      body: prescriptions.map(p => [p.medicamento, p.dosagem, p.frequencia]),
    });

    doc.save(`relatorio-medico-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }

  async function handleAddQuestion() {
    if (!isSupabaseConfigured) return;
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('questions_and_answers').insert([{
        pergunta: newQuestion.pergunta,
        user_id: userId
      }]);
      if (error) throw error;
      closeModal();
      fetchData();
    } catch (error) {
      alert('Erro ao salvar pergunta.');
      console.error(error);
    }
  }

  async function handleToggleQuestion(id: string, respondida: boolean) {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.from('questions_and_answers').update({ respondida: !respondida }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error toggling question:', error);
    }
  }

  async function handleAddLeave() {
    if (!isSupabaseConfigured) return;
    try {
      const userId = await getUserId();
      const { error } = await supabase.from('medical_leaves').insert([{
        data_inicio: newLeave.data_inicio,
        dias_concedidos: newLeave.dias,
        medico_atestado: newLeave.medico,
        user_id: userId
      }]);
      if (error) throw error;
      closeModal();
      fetchData();
    } catch (error) {
      alert('Erro ao salvar licença.');
      console.error(error);
    }
  }

  async function handleAddGalleryImage() {
    if (!isSupabaseConfigured || !newGallery.file) return;
    setUploading(true);
    try {
      const userId = await getUserId();
      const fileExt = newGallery.file.name.split('.').pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;
      const filePath = `gallery/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, newGallery.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('treatment_gallery').insert([{
        imagem_url: publicUrl,
        categoria: newGallery.categoria,
        tags: newGallery.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
        user_id: userId
      }]);

      if (dbError) throw dbError;

      closeModal();
      fetchData();
    } catch (error) {
      alert('Erro ao salvar imagem na galeria.');
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  function closeModal() {
    setShowForm('none');
    setIsAddModalOpen(false);
    setNewChemo({ tipo: 'Vermelha', ciclo: 1, total: 4, data: format(new Date(), 'yyyy-MM-dd') });
    setNewExam({ tipo: '', data: format(new Date(), 'yyyy-MM-dd'), medico: '', birads: '' });
    setNewBlood({ data: format(new Date(), 'yyyy-MM-dd'), leucocitos: 4500, hemoglobina: 12, plaquetas: 250000 });
    setNewPill({ medicamento: '', dosagem: '', frequencia: '' });
    setNewSymptom({ sintoma: 'Fadiga', intensidade: 5, notas: '' });
    setNewDoc({ tipo: '', data: format(new Date(), 'yyyy-MM-dd'), file: null });
    setNewQuestion({ pergunta: '' });
    setNewLeave({ data_inicio: format(new Date(), 'yyyy-MM-dd'), dias: 15, medico: '' });
    setNewGallery({ categoria: 'Evolução', tags: '', file: null });
  }

  // Fallback to mock data if empty (for preview purposes)
  const displayChemo = chemoSessions.length > 0 ? chemoSessions : [
    { id: 'c1', tipo: 'Vermelha' as const, ciclo_atual: 1, total_ciclos: 4, data_prevista: '2026-03-10', realizada: true },
    { id: 'c2', tipo: 'Vermelha' as const, ciclo_atual: 2, total_ciclos: 4, data_prevista: '2026-03-31', realizada: false },
  ];

  const displayBlood = bloodCounts.length > 0 ? bloodCounts.map(b => ({ ...b, label: format(parseISO(b.data_exame), 'dd/MM') })) : [
    { data_exame: '2026-03-01', leucocitos: 4500, label: '01/03' },
    { data_exame: '2026-03-15', leucocitos: 3200, label: '15/03' },
    { data_exame: '2026-03-30', leucocitos: 2800, label: '30/03' },
  ];

  const displayMetrics = metrics.length > 0 ? metrics.map(m => ({ ...m, label: format(parseISO(m.data_medicao), 'dd/MM') })) : [
    { data_medicao: '2026-01-05', maior_eixo_mm: 17.0, label: '05/01' },
    { data_medicao: '2026-03-26', maior_eixo_mm: 26.1, label: '26/03' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <User size={24} />
            </div>
            <div>
              <h1 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Paciente</h1>
              <p className="text-base font-bold leading-tight">Jornada de Tratamento</p>
            </div>
          </div>
          {loading ? (
            <Loader2 className="text-rose-500 animate-spin" size={20} />
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={generatePDFReport} 
                className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                title="Gerar PDF"
              >
                <Download size={20} />
              </button>
              <button onClick={fetchData} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                <Activity className={cn(isSupabaseConfigured ? "text-rose-500" : "text-slate-300")} size={24} />
              </button>
            </div>
          )}
        </div>
      </header>

      {!isSupabaseConfigured && (
        <div className="max-w-md mx-auto px-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-amber-500 shrink-0" size={20} />
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Modo de Demonstração</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Supabase não configurado. Adicione <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> e <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> nos segredos para habilitar a persistência de dados.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <main className="max-w-md mx-auto px-4 pt-6 space-y-6 pb-24">
          {/* Current Cycle Card [NEW] */}
          {chemoSessions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-rose-500 to-rose-600 p-5 rounded-3xl text-white shadow-lg shadow-rose-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-rose-100 text-xs font-medium mb-1">Ciclo de Quimioterapia</p>
                  <h3 className="text-2xl font-bold">Dia 5 de 21</h3>
                </div>
                <div className="bg-white/20 p-2 rounded-xl">
                  <Activity size={24} />
                </div>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div className="bg-white h-full rounded-full" style={{ width: '23.8%' }} />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-medium text-rose-100">
                <span>Início: 28/03</span>
                <span>Próxima: 18/04</span>
              </div>
            </motion.div>
          )}

          {/* Next Dose Reminder */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-indigo-600 rounded-2xl p-5 shadow-lg shadow-indigo-200 text-white flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Bell className="animate-bounce" size={24} />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest opacity-80">Próxima Dose</h2>
                <p className="text-lg font-bold">Anastrazol • 20:00</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase opacity-80">Em</p>
              <p className="text-sm font-bold">2h 15m</p>
            </div>
          </motion.div>

          {/* Quick Actions [NEW] */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setShowForm('scanner')}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Camera size={20} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanner</p>
                <p className="text-xs font-bold text-slate-800">Escanear Doc</p>
              </div>
            </button>
            <button 
              onClick={() => setShowForm('question')}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dúvida</p>
                <p className="text-xs font-bold text-slate-800">Anotar Pergunta</p>
              </div>
            </button>
          </div>

          {/* Clinical Profile Card */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Perfil Clínico</h2>
              <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-100">
                CID: {patient?.cid_principal || 'C50'}
              </span>
            </div>
            <p className="text-slate-700 text-sm font-medium leading-relaxed">
              {patient?.diagnostico_patologico || 'Carcinoma Mamário Invasivo de tipo não-especial, Grau II'}
            </p>
          </motion.section>

          {/* Daily Symptoms Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-800">Diário de Sintomas</h2>
              <button onClick={() => setShowForm('symptom')} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Ver Todos</button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {(symptoms.length > 0 ? symptoms : [
                { id: 's1', sintoma: 'Fadiga', intensidade: 4, data_registro: new Date().toISOString() },
                { id: 's2', sintoma: 'Náusea', intensidade: 2, data_registro: new Date().toISOString() },
              ]).slice(0, 5).map((s) => (
                <div key={s.id} className="min-w-[120px] bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                    s.intensidade > 7 ? "bg-rose-100 text-rose-600" : "bg-violet-100 text-violet-600"
                  )}>
                    {s.intensidade}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">{s.sintoma}</span>
                  <span className="text-[8px] text-slate-400 uppercase font-bold">{format(parseISO(s.data_registro), 'HH:mm')}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Chemotherapy Checklist */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-800">Checklist de Quimioterapia</h2>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Vermelha
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Branca
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {displayChemo.map((session, idx) => (
                <motion.div 
                  key={session.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between transition-all",
                    session.realizada ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-100 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      session.tipo === 'Vermelha' ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                    )}>
                      <Droplets size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        Ciclo {session.ciclo_atual}/{session.total_ciclos} • {session.tipo}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {format(parseISO(session.data_prevista), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <button className={cn(
                    "p-2 rounded-full transition-colors",
                    session.realizada ? "text-emerald-600" : "text-slate-300 hover:text-rose-400"
                  )}>
                    {session.realizada ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Blood Count Tracking (Hemogram) */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="text-rose-500" size={18} />
                <h2 className="text-sm font-bold text-slate-800">Hemogramas</h2>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Leucócitos (mm³)
              </div>
            </div>
            
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayBlood}>
                  <defs>
                    <linearGradient id="colorLeuco" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  />
                  <YAxis hide domain={[0, 'dataMax + 1000']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="leucocitos" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorLeuco)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
              <AlertCircle className="text-rose-500" size={16} />
              <p className="text-[10px] text-rose-700 font-medium leading-tight">
                Atenção: Seus leucócitos estão abaixo do ideal. Evite locais aglomerados.
              </p>
            </div>
          </motion.section>

          {/* Medication Prescriptions */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-800">Medicamentos do Dia</h2>
              <button onClick={() => setShowForm('pill')} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg">
                <Plus size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {(prescriptions.length > 0 ? prescriptions : [
                { id: 'p1', medicamento: 'Anastrazol', dosagem: '1mg', frequencia: '1x ao dia' },
                { id: 'p2', medicamento: 'Zofran', dosagem: '8mg', frequencia: 'Se náuseas' },
              ]).map((presc) => {
                const isTaken = medicationLogs.some(log => 
                  log.prescription_id === presc.id && 
                  format(parseISO(log.data_tomada), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                );
                
                return (
                  <div key={presc.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        isTaken ? "bg-emerald-100 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                      )}>
                        <Pill size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{presc.medicamento}</h3>
                        <p className="text-[10px] text-slate-500 font-medium">{presc.dosagem} • {presc.frequencia}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {presc.arquivo_url && (
                        <a 
                          href={presc.arquivo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <FileText size={18} />
                        </a>
                      )}
                      <button 
                        onClick={() => !isTaken && logMedication(presc.id)}
                        className={cn(
                          "p-2 rounded-full transition-all",
                          isTaken ? "text-emerald-600" : "text-slate-200 hover:text-indigo-400"
                        )}
                      >
                        <CheckCircle2 size={24} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tumor Evolution Chart */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-rose-500" size={18} />
                <h2 className="text-sm font-bold text-slate-800">Evolução do Tumor</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Eixo Y: mm</span>
            </div>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayMetrics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  />
                  <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="maior_eixo_mm" 
                    stroke="#f43f5e" 
                    strokeWidth={3} 
                    dot={{ r: 6, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.section>
        </main>
      )}

      {activeTab === 'exams' && (
        <main className="max-w-md mx-auto px-4 pt-6 space-y-6 pb-24">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold text-slate-800">Laudos e Exames</h2>
            <button onClick={() => setShowForm('scanner')} className="p-2 bg-rose-500 text-white rounded-full shadow-lg">
              <Plus size={20} />
            </button>
          </div>

          {/* Filter Tags */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['Todos', 'Ultrassonografia', 'Ressonância', 'Biópsia', 'Sangue', 'Outros'].map(type => (
              <button 
                key={type}
                onClick={() => setSelectedExamType(type)}
                className={cn(
                  "px-4 py-1.5 rounded-full border text-[10px] font-bold whitespace-nowrap transition-all",
                  selectedExamType === type 
                    ? "bg-rose-500 border-rose-500 text-white" 
                    : "bg-white border-slate-200 text-slate-500"
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {exams
              .filter(exam => selectedExamType === 'Todos' || exam.tipo_documento.toLowerCase().includes(selectedExamType.toLowerCase()))
              .length > 0 ? exams
                .filter(exam => selectedExamType === 'Todos' || exam.tipo_documento.toLowerCase().includes(selectedExamType.toLowerCase()))
                .map((exam) => (
              <motion.div 
                key={exam.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{exam.tipo_documento}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-slate-400 font-medium">
                        {format(parseISO(exam.data_exame), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      {exam.medico_responsavel && (
                        <>
                          <span className="text-slate-300">•</span>
                          <p className="text-[10px] text-slate-400 font-medium italic">
                            {exam.medico_responsavel}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {exam.arquivo_url && (
                  <a 
                    href={exam.arquivo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-50 text-slate-400 rounded-full hover:text-rose-500 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </a>
                )}
              </motion.div>
            )) : (
              <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                <FileText size={48} className="opacity-20" />
                <p className="text-sm font-medium">Nenhum exame encontrado</p>
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === 'gallery' && (
        <main className="max-w-md mx-auto px-4 pt-6 space-y-6 pb-24 text-center">
          <div className="flex items-center justify-between px-1 text-left">
            <h2 className="text-xl font-bold text-slate-800">Diário Visual</h2>
            <button onClick={() => setShowForm('gallery')} className="p-2 bg-rose-500 text-white rounded-full shadow-lg">
              <Camera size={20} />
            </button>
          </div>

          {/* Filter Tags */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['Todos', 'Evolução', 'Pele', 'Cabelo', 'Cateter'].map(tag => (
              <button 
                key={tag}
                className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-500 whitespace-nowrap active:bg-rose-500 active:text-white"
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {galleryImages.length > 0 ? galleryImages.map((img) => (
              <motion.div 
                key={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
              >
                <img 
                  src={img.arquivo_url} 
                  alt={img.categoria} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex flex-col justify-end p-3 text-left">
                  <div className="flex gap-1 mb-1">
                    {img.tags?.map(t => (
                      <span key={t} className="text-[6px] bg-white/20 px-1 rounded text-white uppercase font-bold">{t}</span>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-white truncate">{img.categoria}</p>
                  <p className="text-[8px] text-white/70 font-medium">{format(parseISO(img.data_captura || new Date().toISOString()), 'dd/MM/yyyy')}</p>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-2 py-20 flex flex-col items-center gap-4 text-slate-400">
                <ImageIcon size={48} className="opacity-20" />
                <p className="text-sm font-medium">Nenhuma foto registrada</p>
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === 'questions' && (
        <main className="max-w-md mx-auto px-4 pt-6 space-y-6 pb-24">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold text-slate-800">Dúvidas para Consulta</h2>
            <button onClick={() => setShowForm('question')} className="p-2 bg-rose-500 text-white rounded-full shadow-lg">
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-3">
            {questions.length > 0 ? questions.map((q) => (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "p-4 rounded-2xl border transition-all",
                  q.respondida ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-rose-100 shadow-sm"
                )}
              >
                <div className="flex items-start gap-3">
                  <button 
                    onClick={() => handleToggleQuestion(q.id, q.respondida)}
                    className={cn(
                      "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      q.respondida ? "bg-rose-500 border-rose-500 text-white" : "border-slate-200"
                    )}
                  >
                    {q.respondida && <Check size={12} />}
                  </button>
                  <div className="flex-1">
                    <p className={cn("text-sm font-bold", q.respondida ? "text-slate-400 line-through" : "text-slate-800")}>
                      {q.pergunta}
                    </p>
                    {q.resposta && (
                      <p className="mt-2 text-xs text-slate-500 bg-slate-100 p-2 rounded-lg italic">
                        R: {q.resposta}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                <MessageSquare size={48} className="opacity-20" />
                <p className="text-sm font-medium text-center">Anote aqui suas dúvidas para não esquecer na próxima consulta.</p>
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === 'leaves' && (
        <main className="max-w-md mx-auto px-4 pt-6 space-y-6 pb-24">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold text-slate-800">Afastamentos e Licenças</h2>
            <button onClick={() => setShowForm('leave')} className="p-2 bg-rose-500 text-white rounded-full shadow-lg">
              <Plus size={20} />
            </button>
          </div>

          <div className="space-y-4">
            {medicalLeaves.length > 0 ? medicalLeaves.map((leave) => (
              <motion.div 
                key={leave.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Atestado Médico</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Dr(a). {leave.medico_atestado}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Início</p>
                    <p className="text-xs font-bold text-slate-700">{format(parseISO(leave.data_inicio), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-[8px] font-bold text-emerald-400 uppercase mb-1">Retorno Previsto</p>
                    <p className="text-xs font-bold text-emerald-700">{format(parseISO(leave.data_retorno_prevista), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400">{leave.dias_concedidos} dias de afastamento</span>
                </div>
              </motion.div>
            )) : (
              <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
                <Briefcase size={48} className="opacity-20" />
                <p className="text-sm font-medium">Nenhuma licença registrada</p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Add Modal Overlay */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-8 z-50 shadow-2xl max-w-md mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-800">Novo Registro</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400">
                  <X size={20} />
                </button>
              </div>

              {!showForm || showForm === 'none' ? (
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowForm('chemo')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition-colors"
                  >
                    <Droplets size={32} />
                    <span className="text-xs font-bold uppercase">Quimioterapia</span>
                  </button>
                  <button 
                    onClick={() => setShowForm('exam')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                  >
                    <FileText size={32} />
                    <span className="text-xs font-bold uppercase">Exame</span>
                  </button>
                  <button 
                    onClick={() => setShowForm('blood')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 transition-colors"
                  >
                    <Activity size={32} />
                    <span className="text-xs font-bold uppercase">Hemograma</span>
                  </button>
                  <button 
                    onClick={() => setShowForm('pill')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100 transition-colors"
                  >
                    <Pill size={32} />
                    <span className="text-xs font-bold uppercase">Medicamento</span>
                  </button>
                  <button 
                    onClick={() => setShowForm('symptom')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-violet-50 border border-violet-100 text-violet-600 hover:bg-violet-100 transition-colors"
                  >
                    <Thermometer size={32} />
                    <span className="text-xs font-bold uppercase">Sintoma</span>
                  </button>
                  <button 
                    onClick={() => setShowForm('scanner')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <Camera size={32} />
                    <span className="text-xs font-bold uppercase">Scanner</span>
                  </button>
                  <button 
                    onClick={() => setShowForm('question')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <MessageSquare size={32} />
                    <span className="text-xs font-bold uppercase">Dúvida</span>
                  </button>
                  <button 
                    onClick={() => setShowForm('leave')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-600 hover:bg-cyan-100 transition-colors"
                  >
                    <Briefcase size={32} />
                    <span className="text-xs font-bold uppercase">Licença</span>
                  </button>
                  <button 
                    onClick={() => setShowForm('gallery')}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-pink-50 border border-pink-100 text-pink-600 hover:bg-pink-100 transition-colors"
                  >
                    <ImageIcon size={32} />
                    <span className="text-xs font-bold uppercase">Foto</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={() => setShowForm('none')} className="text-slate-400 text-xs font-bold">Voltar</button>
                    <h3 className="text-sm font-bold text-slate-800">
                      {showForm === 'chemo' && 'Nova Quimioterapia'}
                      {showForm === 'exam' && 'Novo Exame'}
                      {showForm === 'blood' && 'Novo Hemograma'}
                      {showForm === 'pill' && 'Novo Medicamento'}
                      {showForm === 'symptom' && 'Novo Sintoma'}
                      {showForm === 'scanner' && 'Novo Documento'}
                      {showForm === 'question' && 'Nova Pergunta'}
                      {showForm === 'leave' && 'Nova Licença'}
                      {showForm === 'gallery' && 'Nova Foto'}
                    </h3>
                  </div>
                  
                  {showForm === 'chemo' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tipo</label>
                        <div className="flex gap-2">
                          {['Vermelha', 'Branca'].map(t => (
                            <button 
                              key={t}
                              onClick={() => setNewChemo({...newChemo, tipo: t})}
                              className={cn(
                                "flex-1 py-3 rounded-xl text-xs font-bold border transition-all",
                                newChemo.tipo === t ? "bg-rose-500 border-rose-500 text-white" : "bg-white border-slate-200 text-slate-400"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Ciclo Atual</label>
                          <input type="number" value={newChemo.ciclo} onChange={(e) => setNewChemo({...newChemo, ciclo: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Total Ciclos</label>
                          <input type="number" value={newChemo.total} onChange={(e) => setNewChemo({...newChemo, total: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Data Prevista</label>
                        <input type="date" value={newChemo.data} onChange={(e) => setNewChemo({...newChemo, data: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                      </div>
                      <button onClick={handleAddChemo} className="w-full bg-rose-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-rose-200 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Save size={18} /> Salvar Registro
                      </button>
                    </>
                  )}

                  {showForm === 'exam' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tipo de Exame</label>
                        <input type="text" placeholder="Ex: Ressonância Magnética" value={newExam.tipo} onChange={(e) => setNewExam({...newExam, tipo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Médico Responsável</label>
                        <input type="text" placeholder="Nome do médico" value={newExam.medico} onChange={(e) => setNewExam({...newExam, medico: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Data</label>
                          <input type="date" value={newExam.data} onChange={(e) => setNewExam({...newExam, data: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">BI-RADS</label>
                          <input type="text" placeholder="Ex: 4C" value={newExam.birads} onChange={(e) => setNewExam({...newExam, birads: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                      </div>
                      <button onClick={handleAddExam} className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Save size={18} /> Salvar Exame
                      </button>
                    </>
                  )}

                  {showForm === 'blood' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Data do Exame</label>
                        <input type="date" value={newBlood.data} onChange={(e) => setNewBlood({...newBlood, data: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Leucócitos</label>
                          <input type="number" value={newBlood.leucocitos} onChange={(e) => setNewBlood({...newBlood, leucocitos: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Hemoglobina</label>
                          <input type="number" step="0.1" value={newBlood.hemoglobina} onChange={(e) => setNewBlood({...newBlood, hemoglobina: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                      </div>
                      <button onClick={handleAddBlood} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Save size={18} /> Salvar Hemograma
                      </button>
                    </>
                  )}

                  {showForm === 'pill' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Medicamento</label>
                        <input type="text" placeholder="Ex: Anastrazol" value={newPill.medicamento} onChange={(e) => setNewPill({...newPill, medicamento: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Dosagem</label>
                          <input type="text" placeholder="Ex: 1mg" value={newPill.dosagem} onChange={(e) => setNewPill({...newPill, dosagem: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Frequência</label>
                          <input type="text" placeholder="Ex: 1x ao dia" value={newPill.frequencia} onChange={(e) => setNewPill({...newPill, frequencia: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                      </div>
                      <button onClick={handleAddPill} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-amber-200 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Save size={18} /> Salvar Medicamento
                      </button>
                    </>
                  )}

                  {showForm === 'symptom' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sintoma</label>
                        <select 
                          value={newSymptom.sintoma} 
                          onChange={(e) => setNewSymptom({...newSymptom, sintoma: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500"
                        >
                          {['Fadiga', 'Náusea', 'Dor', 'Febre', 'Falta de Apetite', 'Outro'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Intensidade (1-10)</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={newSymptom.intensidade} 
                            onChange={(e) => setNewSymptom({...newSymptom, intensidade: parseInt(e.target.value)})}
                            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                          <span className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs">
                            {newSymptom.intensidade}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Notas</label>
                        <textarea 
                          placeholder="Como você está se sentindo?" 
                          value={newSymptom.notas} 
                          onChange={(e) => setNewSymptom({...newSymptom, notas: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-rose-500 h-24 resize-none"
                        />
                      </div>
                      <button onClick={handleAddSymptom} className="w-full bg-violet-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-violet-200 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Save size={18} /> Salvar Sintoma
                      </button>
                    </>
                  )}

                  {showForm === 'scanner' && (
                    <>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Scanner Inteligente</p>
                          <p className="text-[10px] text-slate-500 font-medium leading-tight">
                            A IA irá classificar automaticamente se é um laudo, receita ou atestado.
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tipo de Documento (Opcional)</label>
                        <input 
                          type="text" 
                          placeholder="A IA preencherá automaticamente" 
                          value={newDoc.tipo} 
                          onChange={(e) => setNewDoc({...newDoc, tipo: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Data do Documento</label>
                        <input 
                          type="date" 
                          value={newDoc.data} 
                          onChange={(e) => setNewDoc({...newDoc, data: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Capturar / Upload (Foto ou PDF)</label>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            capture="environment"
                            onChange={handleFileChange}
                            className="hidden" 
                            id="doc-upload"
                          />
                          <label 
                            htmlFor="doc-upload"
                            className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl px-4 py-8 flex flex-col items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            {aiClassifying ? (
                              <Loader2 className="text-rose-500 animate-spin" size={32} />
                            ) : (
                              <Camera className="text-slate-400" size={32} />
                            )}
                            <span className="text-xs font-bold text-slate-500">
                              {aiClassifying ? 'IA Analisando...' : (newDoc.file ? newDoc.file.name : 'Toque para escanear ou selecionar')}
                            </span>
                          </label>
                        </div>
                      </div>

                      {newDoc.category && (
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="text-emerald-500" size={16} />
                            <p className="text-[10px] font-bold text-emerald-700">
                              Detectado: <span className="uppercase">{newDoc.category}</span>
                            </p>
                          </div>
                          {newDoc.medico && (
                            <p className="text-[9px] text-emerald-600 font-medium ml-6">
                              Médico: {newDoc.medico}
                            </p>
                          )}
                        </div>
                      )}
                      <button 
                        onClick={handleUploadDoc} 
                        disabled={uploading || !newDoc.file}
                        className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-slate-200 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {aiClassifying ? 'IA Analisando...' : (uploading ? 'Enviando...' : 'Salvar Documento')}
                      </button>
                    </>
                  )}

                  {showForm === 'question' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sua Pergunta</label>
                        <textarea 
                          placeholder="O que você quer perguntar ao médico?" 
                          value={newQuestion.pergunta} 
                          onChange={(e) => setNewQuestion({...newQuestion, pergunta: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-rose-500 h-32 resize-none"
                        />
                      </div>
                      <button onClick={handleAddQuestion} className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Save size={18} /> Salvar Pergunta
                      </button>
                    </>
                  )}

                  {showForm === 'leave' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Médico Responsável</label>
                        <input type="text" placeholder="Nome do médico" value={newLeave.medico} onChange={(e) => setNewLeave({...newLeave, medico: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Data de Início</label>
                          <input type="date" value={newLeave.data_inicio} onChange={(e) => setNewLeave({...newLeave, data_inicio: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Dias</label>
                          <input type="number" value={newLeave.dias} onChange={(e) => setNewLeave({...newLeave, dias: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                        </div>
                      </div>
                      <button onClick={handleAddLeave} className="w-full bg-cyan-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-cyan-200 flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <Save size={18} /> Salvar Licença
                      </button>
                    </>
                  )}

                  {showForm === 'gallery' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Categoria</label>
                        <select 
                          value={newGallery.categoria} 
                          onChange={(e) => setNewGallery({...newGallery, categoria: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500"
                        >
                          {['Evolução', 'Pele', 'Cabelo', 'Cateter', 'Outro'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tags (separadas por vírgula)</label>
                        <input type="text" placeholder="Ex: Vermelhidão, Cicatrização" value={newGallery.tags} onChange={(e) => setNewGallery({...newGallery, tags: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Foto</label>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            onChange={(e) => setNewGallery({...newGallery, file: e.target.files?.[0] || null})}
                            className="hidden" 
                            id="gallery-upload"
                          />
                          <label 
                            htmlFor="gallery-upload"
                            className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl px-4 py-8 flex flex-col items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <Camera className="text-slate-400" size={32} />
                            <span className="text-xs font-bold text-slate-500">
                              {newGallery.file ? newGallery.file.name : 'Toque para tirar foto ou selecionar'}
                            </span>
                          </label>
                        </div>
                      </div>
                      <button 
                        onClick={handleAddGalleryImage} 
                        disabled={uploading || !newGallery.file}
                        className="w-full bg-pink-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-pink-200 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {uploading ? 'Enviando...' : 'Salvar na Galeria'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between z-30">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'dashboard' ? "text-rose-500" : "text-slate-400"
          )}
        >
          <Activity size={18} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Início</span>
        </button>
        <button 
          onClick={() => setActiveTab('exams')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'exams' ? "text-rose-500" : "text-slate-400"
          )}
        >
          <ClipboardList size={18} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Exames</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('gallery')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'gallery' ? "text-rose-500" : "text-slate-400"
          )}
        >
          <ImageIcon size={18} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Galeria</span>
        </button>

        {/* Floating Action Button */}
        <div className="relative -top-6">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-200 border-4 border-white active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>

        <button 
          onClick={() => setActiveTab('questions')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'questions' ? "text-rose-500" : "text-slate-400"
          )}
        >
          <MessageSquare size={18} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Dúvidas</span>
        </button>
        <button 
          onClick={() => setActiveTab('leaves')}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === 'leaves' ? "text-rose-500" : "text-slate-400"
          )}
        >
          <Briefcase size={18} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Licenças</span>
        </button>
      </nav>
    </div>
  );
}
