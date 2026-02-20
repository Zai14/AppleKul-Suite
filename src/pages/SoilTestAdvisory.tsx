
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';


const SoilTestAdvisory: React.FC = () => {
  const { user } = useAuth();
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  // For upload: test type selection
  const [uploadTestType, setUploadTestType] = useState<'soil' | 'water' | null>(null);
  // State for manual test entry
  // showTestForm: null | fieldId (string)
  const [showTestForm, setShowTestForm] = useState<string | null>(null);
  // testType: null | 'soil' | 'water'
  const [testType, setTestType] = useState<'soil' | 'water' | null>(null);
  // Soil test form state
  const [testForm, setTestForm] = useState({
    soil_ph: '',
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    oc: '',
    s: '',
    zn: '',
    fe: '',
    mn: '',
    cu: '',
    b: '',
    ec: '',
    lime_requirement: '',
    gypsum_requirement: '',
    recorded_date: '',
  });
  // Water test form state
  const [waterTestForm, setWaterTestForm] = useState({
    ph: '',
    ec: '',
    tds: '',
    hardness: '',
    na: '',
    ca: '',
    mg: '',
    sar: '',
    rsc: '',
    hco3: '',
    co3: '',
    cl: '',
    so4: '',
    b: '',
    no3: '',
    fe: '',
    f: '',
    recorded_date: '',
  });
  const [testSubmitError, setTestSubmitError] = useState<string | null>(null);
  const [testSubmitting, setTestSubmitting] = useState(false);


  // Upload previous report handler (must be hoisted above usage)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string, testType: 'soil' | 'water' | null) => {
    const file = e.target.files?.[0];
    if (!file || !testType) return;
    setUploading(true);
    setUploadError(null);
    try {
      let filePath = `${fieldId}/${Date.now()}_${file.name}`;
      let bucket = testType === 'soil' ? 'soil-reports' : 'water-reports';
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
      if (uploadError) throw uploadError;
      if (user) {
        const today = new Date().toISOString().slice(0, 10);
        if (testType === 'soil') {
          await supabase.from('soil_test_results').insert({
            field_id: fieldId,
            user_id: user.id,
            recorded_date: today,
            soil_ph: null,
            nitrogen: null,
            phosphorus: null,
            potassium: null,
          });
        } else if (testType === 'water') {
          await supabase.from('water_test_results').insert({
            field_id: fieldId,
            user_id: user.id,
            recorded_date: today,
            report_url: `${bucket}/${filePath}`
          });
        }
        await fetchFieldsAndSoilTests();
      }
      alert('Report uploaded!');
      setShowTestForm(fieldId);
    } catch (err) {
      setUploadError((err && (err as any).message) || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadTestType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle test form input change
  const handleTestFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTestForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit water test results to Supabase (water_test_results table)
  async function handleWaterTestFormSubmit(fieldId: string) {
    setTestSubmitting(true);
    setTestSubmitError(null);
    try {
      if (!user) throw new Error('User not authenticated');
      const test_date = waterTestForm.recorded_date || new Date().toISOString().slice(0, 10);
      // Only submit if at least one value is present
      const hasValue = [
        'ph','ec','tds','hardness','na','ca','mg','sar','rsc','hco3','co3','cl','so4','b','no3','fe','f'
      ].some(key => waterTestForm[key]);
      if (!hasValue) throw new Error('Please enter at least one value.');
      const { error: insertError } = await supabase.from('water_test_results').insert({
        field_id: fieldId,
        user_id: user.id,
        test_date,
        ph: waterTestForm.ph ? parseFloat(waterTestForm.ph) : null,
        ec: waterTestForm.ec ? parseFloat(waterTestForm.ec) : null,
        tds: waterTestForm.tds ? parseFloat(waterTestForm.tds) : null,
        hardness: waterTestForm.hardness ? parseFloat(waterTestForm.hardness) : null,
        na: waterTestForm.na ? parseFloat(waterTestForm.na) : null,
        ca: waterTestForm.ca ? parseFloat(waterTestForm.ca) : null,
        mg: waterTestForm.mg ? parseFloat(waterTestForm.mg) : null,
        sar: waterTestForm.sar ? parseFloat(waterTestForm.sar) : null,
        rsc: waterTestForm.rsc ? parseFloat(waterTestForm.rsc) : null,
        hco3: waterTestForm.hco3 ? parseFloat(waterTestForm.hco3) : null,
        co3: waterTestForm.co3 ? parseFloat(waterTestForm.co3) : null,
        cl: waterTestForm.cl ? parseFloat(waterTestForm.cl) : null,
        so4: waterTestForm.so4 ? parseFloat(waterTestForm.so4) : null,
        boron: waterTestForm.b ? parseFloat(waterTestForm.b) : null,
        no3_n: waterTestForm.no3 ? parseFloat(waterTestForm.no3) : null,
        fe: waterTestForm.fe ? parseFloat(waterTestForm.fe) : null,
        f: waterTestForm.f ? parseFloat(waterTestForm.f) : null,
      });
      if (insertError) throw insertError;
      setShowTestForm(null);
      setWaterTestForm({ ph: '', ec: '', tds: '', hardness: '', na: '', ca: '', mg: '', sar: '', rsc: '', hco3: '', co3: '', cl: '', so4: '', b: '', no3: '', fe: '', f: '', recorded_date: '' });
      await fetchFieldsAndSoilTests();
    } catch (err) {
      setTestSubmitError((err && (err as any).message) || 'Failed to submit water test results');
    } finally {
      setTestSubmitting(false);
    }
  }

  // Submit soil test results to Supabase (soil_test_results table)
  const handleTestFormSubmit = async (fieldId: string) => {
    setTestSubmitting(true);
    setTestSubmitError(null);
    try {
      if (!user) throw new Error('User not authenticated');
      const recorded_date = testForm.recorded_date || new Date().toISOString().slice(0, 10);
      // Only submit if at least one value is present
      const hasValue = [
        'soil_ph','nitrogen','phosphorus','potassium','oc','s','zn','fe','mn','cu','b','ec','lime_requirement','gypsum_requirement'
      ].some(key => testForm[key]);
      if (!hasValue) throw new Error('Please enter at least one value.');
      const { error: insertError } = await supabase.from('soil_test_results').insert({
        field_id: fieldId,
        user_id: user.id,
        recorded_date,
        soil_ph: testForm.soil_ph ? parseFloat(testForm.soil_ph) : null,
        nitrogen: testForm.nitrogen ? parseFloat(testForm.nitrogen) : null,
        phosphorus: testForm.phosphorus ? parseFloat(testForm.phosphorus) : null,
        potassium: testForm.potassium ? parseFloat(testForm.potassium) : null,
        oc: testForm.oc ? parseFloat(testForm.oc) : null,
        s: testForm.s ? parseFloat(testForm.s) : null,
        zn: testForm.zn ? parseFloat(testForm.zn) : null,
        fe: testForm.fe ? parseFloat(testForm.fe) : null,
        mn: testForm.mn ? parseFloat(testForm.mn) : null,
        cu: testForm.cu ? parseFloat(testForm.cu) : null,
        b: testForm.b ? parseFloat(testForm.b) : null,
        ec: testForm.ec ? parseFloat(testForm.ec) : null,
        lime_requirement: testForm.lime_requirement ? parseFloat(testForm.lime_requirement) : null,
        gypsum_requirement: testForm.gypsum_requirement ? parseFloat(testForm.gypsum_requirement) : null,
      });
      if (insertError) throw insertError;
      setShowTestForm(null);
      setTestForm({ soil_ph: '', nitrogen: '', phosphorus: '', potassium: '', oc: '', s: '', zn: '', fe: '', mn: '', cu: '', b: '', ec: '', lime_requirement: '', gypsum_requirement: '', recorded_date: '' });
      // Refetch fields/tests (optional: you may want to update this to also fetch from soil_test_results)
      await fetchFieldsAndSoilTests();
    } catch (err) {
      setTestSubmitError((err && (err as any).message) || 'Failed to submit test results');
    } finally {
      setTestSubmitting(false);
    }
  };

  // Nutrient status logic with 15% threshold and advisory fetch
  const deficiencyAdvisory: Record<string, string> = {
    'soil_ph': 'Apply lime to raise pH or sulfur to lower pH as per recommendation.',
    'N': 'Apply recommended dose of nitrogen fertilizer.',
    'P': 'Apply phosphorus fertilizer as per soil test.',
    'K': 'Apply potassium fertilizer as per soil test.',
    // ...add more as needed
  };
  const toxicityAdvisory: Record<string, string> = {
    'soil_ph': 'Reduce lime application or use acidifying amendments.',
    'N': 'Reduce nitrogen application, avoid over-fertilization.',
    'P': 'Reduce phosphorus application, avoid over-fertilization.',
    'K': 'Reduce potassium application, avoid over-fertilization.',
    // ...add more as needed
  };
  const getDeficiencyAlerts = (analytics: any[]) => {
    // Define optimal ranges for each parameter
    const params = [
      { key: 'soil_ph', label: 'Soil pH', green: [6, 7.5] },
      { key: 'N', label: 'Nitrogen (N)', green: [280, 450] },
      { key: 'P', label: 'Phosphorus (P)', green: [20, 40] },
      { key: 'K', label: 'Potassium (K)', green: [120, 250] },
      // ...add more as needed
    ];
    const alerts = [];
    for (const param of params) {
      const val = analytics.find(a => a.metric_type === param.key)?.metric_value;
      if (val === undefined || val === null) continue;
      const [optMin, optMax] = param.green;
      const range = optMax - optMin;
      const margin = range * 0.15;
      let status: 'green' | 'amber' | 'red' = 'green';
      let advisory = '';
      if (val >= optMin && val <= optMax) {
        status = 'green';
      } else if (
        (val >= optMin - margin && val < optMin) ||
        (val > optMax && val <= optMax + margin)
      ) {
        status = 'amber';
        advisory = val < optMin ? deficiencyAdvisory[param.key] || '' : toxicityAdvisory[param.key] || '';
      } else {
        status = 'red';
        advisory = val < optMin ? deficiencyAdvisory[param.key] || '' : toxicityAdvisory[param.key] || '';
      }
      alerts.push({ ...param, value: val, status, advisory });
    }
    return alerts;
  };

  // State for top summary and test type toggle
  const [topSummary, setTopSummary] = useState<any | null>(null);
  const [topTestType, setTopTestType] = useState<'soil' | 'water'>('soil');
  const [latestWaterTest, setLatestWaterTest] = useState<any | null>(null);
  // For comparison chart
  const [allManualResults, setAllManualResults] = useState<any[]>([]);
  const [compareFieldId, setCompareFieldId] = useState<string | null>(null);

  // Fetch fields and analytics
  const fetchFieldsAndSoilTests = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!user) {
      setFields([]);
      setLoading(false);
      return;
    }
    // Fetch all fields for this user
    const { data: fieldsData, error: fieldsError } = await supabase
      .from('fields')
      .select('id, name')
      .eq('user_id', user.id);
    if (fieldsError) {
      setError('Failed to fetch fields.');
      setLoading(false);
      return;
    }
    // For each field, fetch the latest soil test analytic, all manual test results, and latest water test
    const fieldResults = await Promise.all(
      (fieldsData || []).map(async (field: any) => {
        // Latest soil pH from analytics
        const { data: analytics } = await supabase
          .from('field_analytics')
          .select('metric_type, metric_value, recorded_date')
          .eq('field_id', field.id)
          .eq('metric_type', 'soil_ph')
          .order('recorded_date', { ascending: false })
          .limit(1);
        // All analytics for this field (for deficiency analysis)
        const { data: allAnalytics } = await supabase
          .from('field_analytics')
          .select('metric_type, metric_value, recorded_date')
          .eq('field_id', field.id)
          .order('recorded_date', { ascending: false });

        // All manual test results for this field
        const { data: manualResults } = await supabase
          .from('soil_test_results')
          .select('id, recorded_date, soil_ph, nitrogen, phosphorus, potassium, zn, fe, mn, cu, b, ec')
          .eq('field_id', field.id)
          .order('recorded_date', { ascending: false });

        // Latest manual test
        const latestManual = manualResults && manualResults.length > 0 ? manualResults[0] : null;

        // Latest water test result for this field
        const { data: waterResults } = await supabase
          .from('water_test_results')
          .select('id, test_date, ph, ec, tds, hardness, na, ca, mg, sar, rsc, hco3, co3, cl, so4, boron, no3_n, fe, f, report_url')
          .eq('field_id', field.id)
          .order('test_date', { ascending: false })
          .limit(1);
        const latestWater = waterResults && waterResults.length > 0 ? waterResults[0] : null;

        return {
          ...field,
          soilTest: (analytics && analytics.length > 0 && (!latestManual || new Date(analytics[0].recorded_date) > new Date(latestManual.recorded_date)))
            ? { type: 'analytics', ...analytics[0] }
            : (latestManual ? { type: 'manual', ...latestManual } : null),
          allAnalytics: allAnalytics || [],
          latestManual,
          allManualResults: manualResults || [],
          latestWater,
        };
      })
    );
    setFields(fieldResults);

    // For comparison: gather all manual test results for the selected field
    let compareResults: any[] = [];
    if (compareFieldId) {
      const field = fieldResults.find(f => f.id === compareFieldId);
      if (field && field.allManualResults) {
        compareResults = field.allManualResults;
      }
    }
    setAllManualResults(compareResults);
        {/* Comparison chart for manual test results */}
        {fields.length > 0 && (
          <div className="flex flex-col items-center mb-8">
            <div className="mb-2 font-semibold text-green-900">Compare Manual Test Results</div>
            <select
              className="mb-4 border rounded px-2 py-1 text-green-900"
              value={compareFieldId || ''}
              onChange={e => setCompareFieldId(e.target.value || null)}
            >
              <option value="">Select Field</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {allManualResults.length > 0 && (
              <div className="w-full max-w-2xl bg-white rounded-lg p-4 border border-green-200 shadow">
                <div className="mb-2 text-sm text-gray-700">Each bar shows the value for a test date. Hover for details.</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr>
                        <th className="p-2 text-left">Nutrient</th>
                        {allManualResults.map((r, idx) => (
                          <th key={r.id || idx} className="p-2 text-center whitespace-nowrap">{r.recorded_date ? new Date(r.recorded_date).toLocaleDateString() : '-'}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {['soil_ph','ec','nitrogen','phosphorus','potassium','oc','s','zn','fe','mn','cu','b','lime_requirement','gypsum_requirement'].map(nutrient => (
                        <tr key={nutrient}>
                          <td className="p-2 font-semibold text-green-900">{nutrient.replace('_',' ').toUpperCase()}</td>
                          {allManualResults.map((r, idx) => (
                            <td key={r.id || idx} className="p-2">
                              <div className="relative h-5 w-40 bg-green-50 rounded border border-green-200">
                                {r[nutrient] !== undefined && r[nutrient] !== null && r[nutrient] !== '' ? (
                                  <div
                                    className={
                                      nutrient === 'soil_ph' ? 'bg-yellow-300' :
                                      nutrient === 'ec' ? 'bg-blue-200' :
                                      ['nitrogen','phosphorus','potassium'].includes(nutrient) ? 'bg-green-300' :
                                      'bg-gray-200'
                                    }
                                    style={{
                                      width: Math.max(8, Math.min(100, Math.abs(Number(r[nutrient])) * 10)) + '%',
                                      height: '100%',
                                      borderRadius: '0.25rem',
                                      transition: 'width 0.3s',
                                    }}
                                    title={r[nutrient]}
                                  />
                                ) : null}
                                <span className="absolute left-1 top-0 text-xs text-green-900">{r[nutrient] !== undefined && r[nutrient] !== null && r[nutrient] !== '' ? r[nutrient] : '-'}</span>
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

    // Find latest soil and water test across all fields
    let latestField = null;
    let latestDate = null;
    let latestWater = null;
    let latestWaterDate = null;
    fieldResults.forEach(field => {
      if (field.latestManual && (!latestDate || new Date(field.latestManual.recorded_date) > latestDate)) {
        latestField = field;
        latestDate = new Date(field.latestManual.recorded_date);
      }
      if (field.latestWater && (!latestWaterDate || new Date(field.latestWater.test_date) > latestWaterDate)) {
        latestWater = { ...field.latestWater, field: field.name };
        latestWaterDate = new Date(field.latestWater.test_date);
      }
    });
    // Soil summary
    const summary = { lacking: [], excess: [], field: latestField ? latestField.name : '', date: latestField && latestField.latestManual ? latestField.latestManual.recorded_date : '' };
    const params = [
      { key: 'soil_ph', label: 'Soil pH', green: [6, 7.5], amber: [5.5, 8], unit: '' },
      { key: 'ec', label: 'EC (dS/m)', green: [0.2, 1.0], amber: [0.1, 1.5], unit: '' },
      { key: 'nitrogen', label: 'Nitrogen (N)', green: [280, 450], amber: [200, 500], unit: 'kg/ha' },
      { key: 'phosphorus', label: 'Phosphorus (P)', green: [20, 40], amber: [15, 50], unit: 'kg/ha' },
      { key: 'potassium', label: 'Potassium (K)', green: [120, 250], amber: [100, 300], unit: 'kg/ha' },
      { key: 'zn', label: 'Zinc (Zn)', green: [0.6, 1.2], amber: [0.5, 1.5], unit: 'mg/kg' },
      { key: 'fe', label: 'Iron (Fe)', green: [4.5, 8], amber: [4, 10], unit: 'mg/kg' },
      { key: 'mn', label: 'Manganese (Mn)', green: [2, 5], amber: [1.5, 6], unit: 'mg/kg' },
      { key: 'cu', label: 'Copper (Cu)', green: [0.2, 0.5], amber: [0.15, 0.7], unit: 'mg/kg' },
      { key: 'b', label: 'Boron (B)', green: [0.5, 1.0], amber: [0.4, 1.2], unit: 'mg/kg' },
      { key: 'oc', label: 'Organic Carbon (OC)', green: [0.75, 1.5], amber: [0.5, 2.0], unit: '%'},
      { key: 's', label: 'Sulphur (S)', green: [10, 20], amber: [8, 25], unit: 'mg/kg'},
      { key: 'lime_requirement', label: 'Lime Requirement', green: [0, 2], amber: [0, 3], unit: 't/ha'},
      { key: 'gypsum_requirement', label: 'Gypsum Requirement', green: [0, 2], amber: [0, 3], unit: 't/ha'},
    ];
    if (latestField && latestField.latestManual) {
      params.forEach(param => {
        const val = latestField.latestManual[param.key];
        if (val === undefined || val === null) return;
        if (val < param.green[0]) {
          summary.lacking.push(`${param.label} (${val}${param.unit ? ' ' + param.unit : ''})`);
        } else if (val > param.green[1]) {
          summary.excess.push(`${param.label} (${val}${param.unit ? ' ' + param.unit : ''})`);
        }
      });
    }
    setTopSummary(summary);
    setLatestWaterTest(latestWater);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFieldsAndSoilTests();
  }, [fetchFieldsAndSoilTests]);

  const now = new Date();
  const monthsAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 py-10 px-2 flex justify-center items-start">
      <div className="w-full max-w-3xl bg-white/90 rounded-2xl shadow-xl p-8 border border-green-200">
        <h1 className="text-2xl font-bold text-green-900 mb-4 text-center">Soil & Water Test Advisory</h1>
        {/* Top summary card: user can toggle between soil and water test results */}
        <div className="flex justify-center mb-8">
          <Card className="p-6 border-2 border-green-400 bg-gradient-to-br from-green-50 to-green-100 shadow-lg w-full max-w-2xl">
            <div className="flex flex-col items-center mb-3 justify-center">
              <div className="flex items-center mb-1">
                <svg className="w-7 h-7 text-green-700 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4.97 0-9-4.03-9-9 0-4.97 4.03-9 9-9s9 4.03 9 9c0 4.97-4.03 9-9 9zm0 0c-2.21 0-4-1.79-4-4 0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.21-1.79 4-4 4z" /></svg>
                <span className="font-extrabold text-xl text-green-900 tracking-tight">Latest Test Results</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant={topTestType === 'soil' ? 'default' : 'outline'} onClick={() => setTopTestType('soil')}>Soil Test</Button>
                <Button size="sm" variant={topTestType === 'water' ? 'default' : 'outline'} onClick={() => setTopTestType('water')}>Water Test</Button>
              </div>
            </div>
            {topTestType === 'soil' && topSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Lacking Nutrients */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm flex flex-col min-h-[120px]">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-red-500 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                    <span className="font-semibold text-red-700 text-base">Lacking</span>
                  </div>
                  {topSummary.lacking.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border border-red-200 rounded">
                        <thead>
                          <tr className="bg-red-100">
                            <th className="p-2 text-left">Nutrient</th>
                            <th className="p-2 text-left">Value</th>
                            <th className="p-2 text-left">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topSummary.lacking.map((item, idx) => {
                            const match = item.match(/^([^(]+)\s*\(([^)]+)\)$/);
                            let nutrient = item, value = '', unit = '';
                            if (match) {
                              nutrient = match[1].trim();
                              const valParts = match[2].split(' ');
                              value = valParts[0];
                              unit = valParts.slice(1).join(' ');
                            }
                            return (
                              <tr key={idx} className="border-t border-red-100">
                                <td className="p-2 font-semibold text-red-800">{nutrient}</td>
                                <td className="p-2 text-red-700">{value}</td>
                                <td className="p-2 text-red-700">{unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <span className="text-green-700 text-sm italic">No deficiencies detected</span>
                  )}
                </div>
                {/* Excess Nutrients */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm flex flex-col min-h-[120px]">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-yellow-500 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                    <span className="font-semibold text-yellow-700 text-base">Excess</span>
                  </div>
                  {topSummary.excess.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border border-yellow-200 rounded">
                        <thead>
                          <tr className="bg-yellow-100">
                            <th className="p-2 text-left">Nutrient</th>
                            <th className="p-2 text-left">Value</th>
                            <th className="p-2 text-left">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topSummary.excess.map((item, idx) => {
                            const match = item.match(/^([^(]+)\s*\(([^)]+)\)$/);
                            let nutrient = item, value = '', unit = '';
                            if (match) {
                              nutrient = match[1].trim();
                              const valParts = match[2].split(' ');
                              value = valParts[0];
                              unit = valParts.slice(1).join(' ');
                            }
                            return (
                              <tr key={idx} className="border-t border-yellow-100">
                                <td className="p-2 font-semibold text-yellow-800">{nutrient}</td>
                                <td className="p-2 text-yellow-700">{value}</td>
                                <td className="p-2 text-yellow-700">{unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <span className="text-green-700 text-sm italic">No excesses detected</span>
                  )}
                </div>
              </div>
            )}
            {topTestType === 'water' && latestWaterTest && (
              <div className="mt-4">
                <div className="mb-2 text-black text-sm">Field: <span className="font-bold">{latestWaterTest.field}</span>{latestWaterTest.test_date && ` | Test Date: ${new Date(latestWaterTest.test_date).toLocaleDateString()}`}</div>
                {/* Water test parameter optimal ranges and advisory */}
                {(() => {
                  // Define optimal ranges for water test parameters
                  const waterParams = [
                    { key: 'ph', label: 'pH', green: [6.5, 8.4], unit: '' },
                    { key: 'ec', label: 'EC (dS/m)', green: [0, 0.75], unit: '' },
                    { key: 'tds', label: 'TDS (mg/L)', green: [0, 500], unit: '' },
                    { key: 'hardness', label: 'Hardness (mg/L)', green: [0, 300], unit: '' },
                    { key: 'na', label: 'Sodium (Na⁺, mg/L)', green: [0, 200], unit: '' },
                    { key: 'ca', label: 'Calcium (Ca²⁺, mg/L)', green: [0, 200], unit: '' },
                    { key: 'mg', label: 'Magnesium (Mg²⁺, mg/L)', green: [0, 150], unit: '' },
                    { key: 'sar', label: 'SAR', green: [0, 10], unit: '' },
                    { key: 'rsc', label: 'RSC (meq/L)', green: [0, 1.25], unit: '' },
                    { key: 'hco3', label: 'Bicarbonate (HCO₃⁻, mg/L)', green: [0, 200], unit: '' },
                    { key: 'co3', label: 'Carbonate (CO₃²⁻, mg/L)', green: [0, 30], unit: '' },
                    { key: 'cl', label: 'Chloride (Cl⁻, mg/L)', green: [0, 250], unit: '' },
                    { key: 'so4', label: 'Sulphate (SO₄²⁻, mg/L)', green: [0, 200], unit: '' },
                    { key: 'boron', label: 'Boron (mg/L)', green: [0, 0.5], unit: '' },
                    { key: 'no3_n', label: 'Nitrate-N (mg/L)', green: [0, 10], unit: '' },
                    { key: 'fe', label: 'Iron (Fe, mg/L)', green: [0, 0.3], unit: '' },
                    { key: 'f', label: 'Fluoride (F⁻, mg/L)', green: [0, 1.5], unit: '' },
                  ];
                  const lacking = [];
                  const excess = [];
                  waterParams.forEach(param => {
                    const val = latestWaterTest[param.key];
                    if (val === undefined || val === null) return;
                    if (val < param.green[0]) lacking.push(`${param.label} (${val}${param.unit})`);
                    else if (val > param.green[1]) excess.push(`${param.label} (${val}${param.unit})`);
                  });
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm flex flex-col min-h-[80px]">
                        <div className="flex items-center mb-2">
                          <svg className="w-5 h-5 text-red-500 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                          <span className="font-semibold text-red-700 text-base">Lacking</span>
                        </div>
                        {lacking.length > 0 ? (
                          <ul className="list-disc ml-5 text-sm text-red-700">
                            {lacking.map((item, idx) => <li key={idx}>{item}</li>)}
                          </ul>
                        ) : <span className="text-green-700 text-sm italic">No deficiencies detected</span>}
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm flex flex-col min-h-[80px]">
                        <div className="flex items-center mb-2">
                          <svg className="w-5 h-5 text-yellow-500 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                          <span className="font-semibold text-yellow-700 text-base">Excess</span>
                        </div>
                        {excess.length > 0 ? (
                          <ul className="list-disc ml-5 text-sm text-yellow-700">
                            {excess.map((item, idx) => <li key={idx}>{item}</li>)}
                          </ul>
                        ) : <span className="text-green-700 text-sm italic">No excesses detected</span>}
                      </div>
                    </div>
                  );
                })()}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border border-blue-200 rounded">
                    
                    <tbody>
                      {['ph','ec','tds','hardness','na','ca','mg','sar','rsc','hco3','co3','cl','so4','boron','no3_n','fe','f']
                        .filter(param => {
                          // Remove the row if all values match the provided set
                          const testVals = {
                            ph: 100, ec: 100, tds: 1001, hardness: 100, na: 100, ca: 1010, mg: 1001, sar: 110, rsc: 1010, hco3: 101, co3: 110, cl: 1010, so4: 1001, boron: 100, no3_n: 10, fe: 100, f: 101
                          };
                          // If all values match, filter out all
                          const allMatch = Object.keys(testVals).every(k => Number(latestWaterTest[k]) === testVals[k]);
                          if (allMatch) return false;
                          return true;
                        })
                        .map(param => (
                          <tr key={param} className="border-t border-blue-100">
                            <td className="p-2 font-semibold text-blue-900">{param.toUpperCase()}</td>
                            <td className="p-2 text-blue-800">{latestWaterTest[param] !== undefined && latestWaterTest[param] !== null ? latestWaterTest[param] : '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {latestWaterTest.report_url && (
                  <div className="mt-4">
                    <a href={`https://rfaljttsdqinrqbdovbi.supabase.co/storage/v1/object/public/${latestWaterTest.report_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">View Uploaded Report</a>
                  </div>
                )}
              </div>
            )}
            {topTestType === 'water' && !latestWaterTest && (
              <div className="text-blue-700 text-center font-medium mt-4">No water test results found.</div>
            )}
          </Card>
        </div>
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <>
            <p className="mb-6 text-gray-700 text-center">
              The platform checks if your orchards have a recent soil/water lab test. If not, you will be prompted to book a test with a partnered lab.
            </p>
            <div className="space-y-6">
              {fields.map((field) => {
                const needsTest = !field.soilTest || !field.soilTest.recorded_date || monthsAgo(field.soilTest.recorded_date) > 12;
                // Always define deficiencyAlerts for this field
                const deficiencyAlerts = getDeficiencyAlerts(field.allAnalytics);
                // Use latest manual test for indicator, not analytics
                let indicatorColor = 'bg-green-400 border-green-600';
                let indicatorTooltip = 'All nutrients within optimal range';
                if (field.latestManual) {
                  // Use the same params as summary
                  const params = [
                    { key: 'soil_ph', label: 'Soil pH', green: [6, 7.5] },
                    { key: 'ec', label: 'EC (dS/m)', green: [0.2, 1.0] },
                    { key: 'nitrogen', label: 'Nitrogen (N)', green: [280, 450] },
                    { key: 'phosphorus', label: 'Phosphorus (P)', green: [20, 40] },
                    { key: 'potassium', label: 'Potassium (K)', green: [120, 250] },
                    { key: 'zn', label: 'Zinc (Zn)', green: [0.6, 1.2] },
                    { key: 'fe', label: 'Iron (Fe)', green: [4.5, 8] },
                    { key: 'mn', label: 'Manganese (Mn)', green: [2, 5] },
                    { key: 'cu', label: 'Copper (Cu)', green: [0.2, 0.5] },
                    { key: 'b', label: 'Boron (B)', green: [0.5, 1.0] },
                    { key: 'oc', label: 'Organic Carbon (OC)', green: [0.75, 1.5] },
                    { key: 's', label: 'Sulphur (S)', green: [10, 20] },
                    { key: 'lime_requirement', label: 'Lime Requirement', green: [0, 2] },
                    { key: 'gypsum_requirement', label: 'Gypsum Requirement', green: [0, 2] },
                  ];
                  let excessList = [];
                  let lackingList = [];
                  for (const param of params) {
                    const val = field.latestManual[param.key];
                    if (val === undefined || val === null) continue;
                    if (val > param.green[1]) excessList.push(param.label);
                    else if (val < param.green[0]) lackingList.push(param.label);
                  }
                  if (excessList.length > 0) {
                    indicatorColor = 'bg-red-400 border-red-600';
                    indicatorTooltip = 'Excess: ' + excessList.join(', ');
                  } else if (lackingList.length > 0) {
                    indicatorColor = 'bg-yellow-300 border-yellow-500';
                    indicatorTooltip = 'Lacking: ' + lackingList.join(', ');
                  }
                }
                return (
                  <Card key={field.id} className="mb-4 p-4 transition-shadow duration-200 hover:shadow-2xl bg-gradient-to-br from-green-50 to-white border-2 border-green-100 rounded-2xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {/* Unique status indicator with icon and gradient ring */}
                        <span
                          className={`relative flex items-center justify-center w-8 h-8 rounded-full border-4 shadow-md transition-all duration-200 ${indicatorColor} bg-white/80 hover:scale-110`}
                          style={{
                            background: indicatorColor.includes('red')
                              ? 'radial-gradient(circle at 60% 40%, #fff 60%, #f87171 100%)'
                              : indicatorColor.includes('yellow')
                              ? 'radial-gradient(circle at 60% 40%, #fff 60%, #fde68a 100%)'
                              : 'radial-gradient(circle at 60% 40%, #fff 60%, #6ee7b7 100%)',
                          }}
                          title={indicatorTooltip}
                        >
                          {indicatorColor.includes('red') ? (
                            <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728" /></svg>
                          ) : indicatorColor.includes('yellow') ? (
                            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg>
                          ) : (
                            <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </span>
                        <span className="font-extrabold text-lg text-green-900 tracking-tight drop-shadow-sm">{field.name}</span>
                        {needsTest ? (
                          <span className="ml-2 text-red-600 font-medium">No recent soil/water test found.</span>
                        ) : (
                          <span className="ml-2 text-green-700 text-sm font-medium">Last test: {new Date(field.soilTest.recorded_date).toLocaleDateString()} <span className="hidden md:inline">(pH: {field.soilTest.metric_value})</span></span>
                        )}
                      </div>
                      <div className="mt-2 md:mt-0 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedFieldId(field.id); setUploadTestType(null); }}>Upload Previous Report</Button>
                        {/* Upload test type selection modal */}
                        {selectedFieldId === field.id && uploadTestType === null && (
                          <div className="fixed inset-0 flex items-center justify-center bg-gray-200 bg-opacity-40 z-50">
                            <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center">
                              <div className="mb-3 font-semibold">Select Test Type for Upload</div>
                              <div className="flex gap-4 mb-4">
                                <Button size="sm" onClick={() => { setUploadTestType('soil'); setTimeout(() => fileInputRef.current?.click(), 100); }}>Soil Test</Button>
                                <Button size="sm" onClick={() => { setUploadTestType('water'); setTimeout(() => fileInputRef.current?.click(), 100); }}>Water Test</Button>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => setSelectedFieldId(null)}>Cancel</Button>
                            </div>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={e => handleFileChange(e, field.id, uploadTestType)}
                          disabled={uploading}
                        />
                        <Button size="sm" variant="outline" onClick={() => { setShowTestForm(field.id); setTestType(null); }}>Enter Test Results</Button>
                      </div>
                    </div>
                    {uploadError && selectedFieldId === field.id && (
                      <div className="text-red-600 text-sm mb-2">{uploadError}</div>
                    )}
                    {/* Manual test entry form: test type selection and conditional form */}
                    {showTestForm === field.id && (
                      <div className="bg-green-50 border border-green-200 rounded p-4 my-2">
                        {!testType ? (
                          <div className="flex flex-col items-center">
                            <div className="font-semibold mb-2">Select Test Type</div>
                            <div className="flex gap-4 mb-2">
                              <Button size="sm" onClick={() => setTestType('soil')}>Soil Test</Button>
                              <Button size="sm" onClick={() => setTestType('water')}>Water Test</Button>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setShowTestForm(null)}>Cancel</Button>
                          </div>
                        ) : null}
                        {/* Soil Test Form */}
                        {testType === 'soil' && (
                          <>
                            <div className="font-semibold mb-2">Enter Soil Test Results</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                              <div>
                                <label className="block text-sm">Soil pH</label>
                                <input type="number" step="0.01" name="soil_ph" value={testForm.soil_ph} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Nitrogen (N)</label>
                                <input type="number" name="nitrogen" value={testForm.nitrogen} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Phosphorus (P)</label>
                                <input type="number" name="phosphorus" value={testForm.phosphorus} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Potassium (K)</label>
                                <input type="number" name="potassium" value={testForm.potassium} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Organic Carbon (OC)</label>
                                <input type="number" name="oc" value={testForm.oc} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Sulphur (S)</label>
                                <input type="number" name="s" value={testForm.s} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Zinc (Zn)</label>
                                <input type="number" name="zn" value={testForm.zn} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Iron (Fe)</label>
                                <input type="number" name="fe" value={testForm.fe} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Manganese (Mn)</label>
                                <input type="number" name="mn" value={testForm.mn} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Copper (Cu)</label>
                                <input type="number" name="cu" value={testForm.cu} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Boron (B)</label>
                                <input type="number" name="b" value={testForm.b} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">EC (dS/m)</label>
                                <input type="number" name="ec" value={testForm.ec} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Lime Requirement</label>
                                <input type="number" name="lime_requirement" value={testForm.lime_requirement} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Gypsum Requirement</label>
                                <input type="number" name="gypsum_requirement" value={testForm.gypsum_requirement} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Test Date</label>
                                <input type="date" name="recorded_date" value={testForm.recorded_date} onChange={handleTestFormChange} className="w-full border rounded px-2 py-1" />
                              </div>
                            </div>
                            {testSubmitError && <div className="text-red-600 text-sm mb-2">{testSubmitError}</div>}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleTestFormSubmit(field.id)} disabled={testSubmitting}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setShowTestForm(null)} disabled={testSubmitting}>Cancel</Button>
                            </div>
                          </>
                        )}
                        {/* Water Test Form */}
                        {testType === 'water' && (
                          <>
                            <div className="font-semibold mb-2">Enter Water Test Results</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                              <div>
                                <label className="block text-sm">pH</label>
                                <input type="number" step="0.01" name="ph" value={waterTestForm.ph} onChange={e => setWaterTestForm(f => ({ ...f, ph: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">EC (Electrical Conductivity)</label>
                                <input type="number" name="ec" value={waterTestForm.ec} onChange={e => setWaterTestForm(f => ({ ...f, ec: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">TDS (Total Dissolved Solids)</label>
                                <input type="number" name="tds" value={waterTestForm.tds} onChange={e => setWaterTestForm(f => ({ ...f, tds: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Hardness (Ca + Mg)</label>
                                <input type="number" name="hardness" value={waterTestForm.hardness} onChange={e => setWaterTestForm(f => ({ ...f, hardness: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Sodium (Na⁺)</label>
                                <input type="number" name="na" value={waterTestForm.na} onChange={e => setWaterTestForm(f => ({ ...f, na: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Calcium (Ca²⁺)</label>
                                <input type="number" name="ca" value={waterTestForm.ca} onChange={e => setWaterTestForm(f => ({ ...f, ca: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Magnesium (Mg²⁺)</label>
                                <input type="number" name="mg" value={waterTestForm.mg} onChange={e => setWaterTestForm(f => ({ ...f, mg: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">SAR (Sodium Adsorption Ratio)</label>
                                <input type="number" name="sar" value={waterTestForm.sar} onChange={e => setWaterTestForm(f => ({ ...f, sar: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">RSC (Residual Sodium Carbonate)</label>
                                <input type="number" name="rsc" value={waterTestForm.rsc} onChange={e => setWaterTestForm(f => ({ ...f, rsc: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Bicarbonate (HCO₃⁻)</label>
                                <input type="number" name="hco3" value={waterTestForm.hco3} onChange={e => setWaterTestForm(f => ({ ...f, hco3: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Carbonate (CO₃²⁻)</label>
                                <input type="number" name="co3" value={waterTestForm.co3} onChange={e => setWaterTestForm(f => ({ ...f, co3: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Chloride (Cl⁻)</label>
                                <input type="number" name="cl" value={waterTestForm.cl} onChange={e => setWaterTestForm(f => ({ ...f, cl: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Sulphate (SO₄²⁻)</label>
                                <input type="number" name="so4" value={waterTestForm.so4} onChange={e => setWaterTestForm(f => ({ ...f, so4: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Boron (B)</label>
                                <input type="number" name="b" value={waterTestForm.b} onChange={e => setWaterTestForm(f => ({ ...f, b: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Nitrate (NO₃⁻)</label>
                                <input type="number" name="no3" value={waterTestForm.no3} onChange={e => setWaterTestForm(f => ({ ...f, no3: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Iron (Fe)</label>
                                <input type="number" name="fe" value={waterTestForm.fe} onChange={e => setWaterTestForm(f => ({ ...f, fe: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Fluoride (F⁻)</label>
                                <input type="number" name="f" value={waterTestForm.f} onChange={e => setWaterTestForm(f => ({ ...f, f: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                              <div>
                                <label className="block text-sm">Test Date</label>
                                <input type="date" name="recorded_date" value={waterTestForm.recorded_date} onChange={e => setWaterTestForm(f => ({ ...f, recorded_date: e.target.value }))} className="w-full border rounded px-2 py-1" />
                              </div>
                            </div>
                            {testSubmitError && <div className="text-red-600 text-sm mb-2">{testSubmitError}</div>}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleWaterTestFormSubmit(field.id)} disabled={testSubmitting}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setShowTestForm(null)} disabled={testSubmitting}>Cancel</Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {deficiencyAlerts.length > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold mb-1">Nutrient Deficiency & RAG Alerts:</div>
                        <ul className="space-y-2">
                          {deficiencyAlerts.map(alert => (
                            <li key={alert.key} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-2 rounded-lg border border-gray-100 bg-gray-50">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{alert.label}:</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${alert.status === 'green' ? 'bg-green-100 text-green-800' : alert.status === 'amber' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{alert.status.toUpperCase()}</span>
                                <span className="text-gray-700">({alert.value})</span>
                              </div>
                              {(alert.status === 'amber' || alert.status === 'red') && alert.advisory && (
                                <div className={`text-xs md:text-sm ${alert.status === 'red' ? 'text-red-700' : 'text-yellow-700'} font-medium pl-6 md:pl-0`}>Action: {alert.advisory}</div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
            {fields.every(f => f.soilTest && f.soilTest.recorded_date && monthsAgo(f.soilTest.recorded_date) <= 12) ? (
              <div className="text-green-700 text-center font-medium">All orchards have recent soil/water tests.</div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
};

export default SoilTestAdvisory;
