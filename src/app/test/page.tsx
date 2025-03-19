'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"

interface TestResult {
    id: string;
    email: {
        subject: string;
        from: string;
        bodyPreview: string;
    };
    classification: {
        isMedical: boolean;
        confidence: number;
        category?: string;
    };
}

interface TestStats {
    total: number;
    medical: number;
    byCategory: Record<string, number>;
    averageConfidence: number;
}

export default function TestPage() {
    const [results, setResults] = useState<TestResult[]>([]);
    const [stats, setStats] = useState<TestStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runTest = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No session found');
            }

            const response = await fetch('/api/test-classifier', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Test failed');
            }

            setResults(data.results);
            setStats(data.stats);

        } catch (error) {
            console.error('Test error:', error);
            setError(error instanceof Error ? error.message : 'Test failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">Email Classification Test</h1>
                <Button
                    onClick={runTest}
                    disabled={isLoading}
                >
                    {isLoading ? 'Testing...' : 'Run Test'}
                </Button>
            </div>

            {error && (
                <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-lg">
                    {error}
                </div>
            )}

            {stats && (
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Statistics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-sm text-gray-600">Total Emails</div>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Medical Emails</div>
                            <div className="text-2xl font-bold">{stats.medical}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Average Confidence</div>
                            <div className="text-2xl font-bold">{(stats.averageConfidence * 100).toFixed(1)}%</div>
                        </div>
                    </div>

                    {Object.keys(stats.byCategory).length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold mb-2">Categories</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(stats.byCategory).map(([category, count]) => (
                                    <div key={category} className="text-sm">
                                        <span className="font-medium">{category}:</span> {count}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {results.length > 0 && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Results</h2>
                    <div className="space-y-4">
                        {results.map((result) => (
                            <div
                                key={result.id}
                                className={`p-4 rounded-lg border ${
                                    result.classification.isMedical
                                        ? 'border-blue-200 bg-blue-50'
                                        : 'border-gray-200'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium">{result.email.subject}</div>
                                    <div className="text-sm">
                                        {(result.classification.confidence * 100).toFixed(1)}% confident
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                    From: {result.email.from}
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                    {result.email.bodyPreview}
                                </div>
                                {result.classification.category && (
                                    <div className="text-sm">
                                        Category: <span className="font-medium">{result.classification.category}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
