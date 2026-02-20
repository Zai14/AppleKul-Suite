import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit, Trash2, Save, X, FileText, TrendingUp, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface SoilTestResult {
  id: string;
  fieldId: string;
  fieldName: string;
  testDate: string;
  soilPh: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  organicMatter: number | null;
  ec: number | null;
  calcium: number | null;
  magnesium: number | null;
  sulfur: number | null;
  iron: number | null;
  manganese: number | null;
  zinc: number | null;
  copper: number | null;
  boron: number | null;
  labName: string;
  recommendations: string;
  notes: string;
}

interface Field {
  id: string;
  name: string;
}

const SoilTestAdvisory: React.FC = () => {
  const { session } = useAuth();
  const [soilTests, setSoilTests] = useState<SoilTestResult[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedTest, setSelectedTest] = useState<SoilTestResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fieldId: '',
    testDate: '',
    soilPh: '',
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    organicMatter: '',
    ec: '',
    calcium: '',
    magnesium: '',
    sulfur: '',
    iron: '',
    manganese: '',
    zinc: '',
    copper: '',
    boron: '',
    labName: '',
    recommendations: '',
    notes: '',
  });

  // Load fields and soil tests
  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session?.user]);

  const loadData = async () => {
    if (!session?.user) return;

    setLoading(true);
    setError(null);

    try {
      // Load fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('fields')
        .select('id, name')
        .eq('user_id', session.user.id)
        .order('name');

      if (fieldsError) throw fieldsError;

      setFields(fieldsData || []);

      // Load soil test results with field names
      const { data: testsData, error: testsError } = await supabase
        .from('soil_test_results')
        .select(`
          *,
          fields!inner(name)
        `)
        .eq('user_id', session.user.id)
        .order('test_date', { ascending: false });

      if (testsError) throw testsError;

      const mappedTests: SoilTestResult[] = (testsData || []).map((row: any) => ({
        id: row.id,
        fieldId: row.field_id,
        fieldName: row.fields.name,
        testDate: row.test_date,
        soilPh: row.soil_ph,
        nitrogen: row.nitrogen,
        phosphorus: row.phosphorus,
        potassium: row.potassium,
        organicMatter: row.organic_matter,
        ec: row.ec,
        calcium: row.calcium,
        magnesium: row.magnesium,
        sulfur: row.sulfur,
        iron: row.iron,
        manganese: row.manganese,
        zinc: row.zinc,
        copper: row.copper,
        boron: row.boron,
        labName: row.lab_name || '',
        recommendations: row.recommendations || '',
        notes: row.notes || '',
      }));

      setSoilTests(mappedTests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      fieldId: '',
      testDate: '',
      soilPh: '',
      nitrogen: '',
      phosphorus: '',
      potassium: '',
      organicMatter: '',
      ec: '',
      calcium: '',
      magnesium: '',
      sulfur: '',
      iron: '',
      manganese: '',
      zinc: '',
      copper: '',
      boron: '',
      labName: '',
      recommendations: '',
      notes: '',
    });
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedTest(null);
    resetForm();
  };

  const handleEdit = (test: SoilTestResult) => {
    setSelectedTest(test);
    setIsEditing(true);
    setIsCreating(false);
    setFormData({
      fieldId: test.fieldId,
      testDate: test.testDate,
      soilPh: test.soilPh?.toString() || '',
      nitrogen: test.nitrogen?.toString() || '',
      phosphorus: test.phosphorus?.toString() || '',
      potassium: test.potassium?.toString() || '',
      organicMatter: test.organicMatter?.toString() || '',
      ec: test.ec?.toString() || '',
      calcium: test.calcium?.toString() || '',
      magnesium: test.magnesium?.toString() || '',
      sulfur: test.sulfur?.toString() || '',
      iron: test.iron?.toString() || '',
      manganese: test.manganese?.toString() || '',
      zinc: test.zinc?.toString() || '',
      copper: test.copper?.toString() || '',
      boron: test.boron?.toString() || '',
      labName: test.labName,
      recommendations: test.recommendations,
      notes: test.notes,
    });
  };

  const handleSave = async () => {
    if (!session?.user) return;

    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.testDate) {
        setError('Test Date is required.');
        setSaving(false);
        return;
      }

      const testData = {
        user_id: session.user.id,
        test_date: formData.testDate,
        // field_id is nullable in the schema
        field_id: formData.fieldId && formData.fieldId !== '' ? formData.fieldId : null,
        soil_ph: formData.soilPh ? parseFloat(formData.soilPh) : null,
        nitrogen: formData.nitrogen ? parseFloat(formData.nitrogen) : null,
        phosphorus: formData.phosphorus ? parseFloat(formData.phosphorus) : null,
        potassium: formData.potassium ? parseFloat(formData.potassium) : null,
        organic_matter: formData.organicMatter ? parseFloat(formData.organicMatter) : null,
        ec: formData.ec ? parseFloat(formData.ec) : null,
        calcium: formData.calcium ? parseFloat(formData.calcium) : null,
        magnesium: formData.magnesium ? parseFloat(formData.magnesium) : null,
        sulfur: formData.sulfur ? parseFloat(formData.sulfur) : null,
        iron: formData.iron ? parseFloat(formData.iron) : null,
        manganese: formData.manganese ? parseFloat(formData.manganese) : null,
        zinc: formData.zinc ? parseFloat(formData.zinc) : null,
        copper: formData.copper ? parseFloat(formData.copper) : null,
        boron: formData.boron ? parseFloat(formData.boron) : null,
        lab_name: formData.labName,
        recommendations: formData.recommendations,
        notes: formData.notes,
      };

      if (isCreating) {
        const { error } = await supabase
          .from('soil_test_results')
          .insert([testData]);

        if (error) throw error;
      } else if (selectedTest) {
        const { error } = await supabase
          .from('soil_test_results')
          .update(testData)
          .eq('id', selectedTest.id)
          .eq('user_id', session.user.id);

        if (error) throw error;
      }

      await loadData();
      setIsCreating(false);
      setIsEditing(false);
      setSelectedTest(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save soil test');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (test: SoilTestResult) => {
    if (!session?.user || !confirm('Are you sure you want to delete this soil test?')) return;

    try {
      const { error } = await supabase
        .from('soil_test_results')
        .delete()
        .eq('id', test.id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      await loadData();
      if (selectedTest?.id === test.id) {
        setSelectedTest(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete soil test');
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedTest(null);
    resetForm();
  };

  const getParameterStatus = (value: number | null, parameter: string) => {
    if (value === null) return { status: 'unknown', color: 'text-gray-500', icon: null };

    let status = 'normal';
    let color = 'text-green-600';
    let icon = CheckCircle;

    // Define optimal ranges for different parameters
    const ranges: Record<string, { low: number; high: number }> = {
      soilPh: { low: 6.0, high: 7.5 },
      nitrogen: { low: 20, high: 40 },
      phosphorus: { low: 15, high: 30 },
      potassium: { low: 150, high: 300 },
      organicMatter: { low: 2.0, high: 4.0 },
      ec: { low: 0.2, high: 0.8 },
    };

    const range = ranges[parameter];
    if (range) {
      if (value < range.low) {
        status = 'low';
        color = 'text-red-600';
        icon = AlertTriangle;
      } else if (value > range.high) {
        status = 'high';
        color = 'text-orange-600';
        icon = TrendingUp;
      }
    }

    return { status, color, icon };
  };

  const generateRecommendations = (test: SoilTestResult) => {
    const recommendations = [];

    if (test.soilPh !== null) {
      if (test.soilPh < 6.0) {
        recommendations.push('Soil is acidic. Apply lime to raise pH to 6.5-7.0 range.');
      } else if (test.soilPh > 7.5) {
        recommendations.push('Soil is alkaline. Apply sulfur or organic matter to lower pH.');
      }
    }

    if (test.nitrogen !== null && test.nitrogen < 20) {
      recommendations.push('Nitrogen levels are low. Apply nitrogen-rich fertilizers or compost.');
    }

    if (test.phosphorus !== null && test.phosphorus < 15) {
      recommendations.push('Phosphorus levels are low. Apply phosphate fertilizers.');
    }

    if (test.potassium !== null && test.potassium < 150) {
      recommendations.push('Potassium levels are low. Apply potash or wood ash.');
    }

    if (test.organicMatter !== null && test.organicMatter < 2.0) {
      recommendations.push('Organic matter is low. Add compost, manure, or cover crops.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Soil parameters are within acceptable ranges. Continue current management practices.');
    }

    return recommendations;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading soil test data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Soil Test Advisory</h1>
        <Button onClick={handleCreate} className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Soil Test</span>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Soil Tests List */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Soil Test Results</h2>
            {soilTests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No soil tests recorded yet</p>
                <Button onClick={handleCreate} size="sm">
                  Add First Test
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {soilTests.map((test) => (
                  <div
                    key={test.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTest?.id === test.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => setSelectedTest(test)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{test.fieldName || 'General Test'}</h3>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(test);
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(test);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>Test Date: {new Date(test.testDate).toLocaleDateString()}</div>
                      {test.labName && <div>Lab: {test.labName}</div>}
                      <div className="flex items-center gap-2 mt-2">
                        {test.soilPh !== null && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            getParameterStatus(test.soilPh, 'soilPh').status === 'normal' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            pH: {test.soilPh}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Form and Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Form */}
          {(isCreating || isEditing) && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {isCreating ? 'Add Soil Test Result' : 'Edit Soil Test Result'}
                </h2>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field
                    </label>
                    <select
                      name="fieldId"
                      value={formData.fieldId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select a field (optional)</option>
                      {fields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Test Date *
                    </label>
                    <input
                      type="date"
                      name="testDate"
                      value={formData.testDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lab Name
                    </label>
                    <input
                      type="text"
                      name="labName"
                      value={formData.labName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Testing laboratory name"
                    />
                  </div>
                </div>

                {/* Soil Parameters */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Soil Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        pH
                      </label>
                      <input
                        type="number"
                        name="soilPh"
                        value={formData.soilPh}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        max="14"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="6.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        EC (dS/m)
                      </label>
                      <input
                        type="number"
                        name="ec"
                        value={formData.ec}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="0.5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organic Matter (%)
                      </label>
                      <input
                        type="number"
                        name="organicMatter"
                        value={formData.organicMatter}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="3.0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nitrogen (kg/ha)
                      </label>
                      <input
                        type="number"
                        name="nitrogen"
                        value={formData.nitrogen}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phosphorus (kg/ha)
                      </label>
                      <input
                        type="number"
                        name="phosphorus"
                        value={formData.phosphorus}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Potassium (kg/ha)
                      </label>
                      <input
                        type="number"
                        name="potassium"
                        value={formData.potassium}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Calcium (mg/kg)
                      </label>
                      <input
                        type="number"
                        name="calcium"
                        value={formData.calcium}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Magnesium (mg/kg)
                      </label>
                      <input
                        type="number"
                        name="magnesium"
                        value={formData.magnesium}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sulfur (mg/kg)
                      </label>
                      <input
                        type="number"
                        name="sulfur"
                        value={formData.sulfur}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Iron (mg/kg)
                      </label>
                      <input
                        type="number"
                        name="iron"
                        value={formData.iron}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manganese (mg/kg)
                      </label>
                      <input
                        type="number"
                        name="manganese"
                        value={formData.manganese}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zinc (mg/kg)
                      </label>
                      <input
                        type="number"
                        name="zinc"
                        value={formData.zinc}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Copper (mg/kg)
                      </label>
                      <input
                        type="number"
                        name="copper"
                        value={formData.copper}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Boron (mg/kg)
                      </label>
                      <input
                        type="number"
                        name="boron"
                        value={formData.boron}
                        onChange={handleInputChange}
                        step="0.1"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Recommendations and Notes */}
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lab Recommendations
                    </label>
                    <textarea
                      name="recommendations"
                      value={formData.recommendations}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter recommendations from the testing laboratory..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Any additional observations or notes..."
                    />
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* Test Details */}
          {selectedTest && !isEditing && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Soil Test Results - {selectedTest.fieldName || 'General Test'}
                </h2>
                <Button
                  onClick={() => handleEdit(selectedTest)}
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>

              <div className="space-y-6">
                {/* Test Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Test Date</h3>
                    <p className="text-lg text-gray-900">
                      {new Date(selectedTest.testDate).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedTest.labName && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Laboratory</h3>
                      <p className="text-lg text-gray-900">{selectedTest.labName}</p>
                    </div>
                  )}
                </div>

                {/* Key Parameters */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Key Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: 'soilPh', label: 'pH', value: selectedTest.soilPh, unit: '' },
                      { key: 'ec', label: 'EC', value: selectedTest.ec, unit: 'dS/m' },
                      { key: 'organicMatter', label: 'Organic Matter', value: selectedTest.organicMatter, unit: '%' },
                      { key: 'nitrogen', label: 'Nitrogen', value: selectedTest.nitrogen, unit: 'kg/ha' },
                      { key: 'phosphorus', label: 'Phosphorus', value: selectedTest.phosphorus, unit: 'kg/ha' },
                      { key: 'potassium', label: 'Potassium', value: selectedTest.potassium, unit: 'kg/ha' },
                    ].map(({ key, label, value, unit }) => {
                      if (value === null) return null;
                      const status = getParameterStatus(value, key);
                      const Icon = status.icon;
                      return (
                        <div key={key} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-700">{label}</h4>
                            {Icon && <Icon className={`w-4 h-4 ${status.color}`} />}
                          </div>
                          <p className={`text-lg font-semibold ${status.color}`}>
                            {value} {unit}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Micronutrients */}
                {(selectedTest.calcium || selectedTest.magnesium || selectedTest.sulfur || 
                  selectedTest.iron || selectedTest.manganese || selectedTest.zinc || 
                  selectedTest.copper || selectedTest.boron) && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Micronutrients</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'Calcium', value: selectedTest.calcium, unit: 'mg/kg' },
                        { label: 'Magnesium', value: selectedTest.magnesium, unit: 'mg/kg' },
                        { label: 'Sulfur', value: selectedTest.sulfur, unit: 'mg/kg' },
                        { label: 'Iron', value: selectedTest.iron, unit: 'mg/kg' },
                        { label: 'Manganese', value: selectedTest.manganese, unit: 'mg/kg' },
                        { label: 'Zinc', value: selectedTest.zinc, unit: 'mg/kg' },
                        { label: 'Copper', value: selectedTest.copper, unit: 'mg/kg' },
                        { label: 'Boron', value: selectedTest.boron, unit: 'mg/kg' },
                      ].map(({ label, value, unit }) => {
                        if (value === null) return null;
                        return (
                          <div key={label} className="text-center">
                            <h4 className="text-sm font-medium text-gray-700">{label}</h4>
                            <p className="text-lg text-gray-900">{value} {unit}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI-Generated Recommendations */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">AI-Generated Recommendations</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      {generateRecommendations(selectedTest).map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-blue-900">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Lab Recommendations */}
                {selectedTest.recommendations && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Lab Recommendations</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-900 whitespace-pre-wrap">{selectedTest.recommendations}</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedTest.notes && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedTest.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoilTestAdvisory;