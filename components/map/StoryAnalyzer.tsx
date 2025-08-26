'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, RotateCcw, FileText, Globe, BarChart3 } from 'lucide-react';

interface NewsStory {
  id: string;
  headline: string;
  content: string;
  publishedAt: Date;
  source: string;
}

interface StoryAnalyzerProps {
  onStoryAnalyze: (story: NewsStory) => void;
  onTimelineChange: (position: number) => void;
  currentStory: NewsStory | null;
  isAnalyzing: boolean;
}

const SAMPLE_STORIES = [
  {
    id: 'nord-stream',
    headline: 'Explosions Rupture Nord Stream Pipelines in Baltic Sea',
    content: 'Multiple explosions damaged the Nord Stream 1 and Nord Stream 2 gas pipelines in the Baltic Sea on Monday, causing massive methane leaks and raising concerns about energy security across Europe. The pipelines, which carry natural gas from Russia to Germany, were ruptured in Swedish and Danish waters near the island of Bornholm. Seismologists detected explosions at 2:03 AM and 7:03 PM local time. The incidents have prompted investigations and raised questions about sabotage, as both pipelines were not operational but contained pressurized gas. European gas prices surged following the news, while environmental concerns mount over the methane release into the Baltic Sea.',
    publishedAt: new Date('2022-09-26'),
    source: 'Reuters'
  },
  {
    id: 'svb-collapse',
    headline: 'Silicon Valley Bank Collapses in Spectacular Fashion',
    content: 'Silicon Valley Bank collapsed Friday after a stunning 48 hours in which a bank run and a capital crisis led to the second-largest failure of a financial institution in US history. California regulators shut down the tech lender and put it under the control of the US Federal Deposit Insurance Corporation. The bank, which had $209 billion in assets at the end of 2022, saw its stock price plummet 60% before trading was halted. The collapse was triggered by the bank\'s announcement Wednesday that it had sold $21 billion of securities at a loss and would seek to raise $2.25 billion in new capital. Tech companies and startups that relied on SVB for banking services scrambled to manage payroll and operations as the crisis unfolded.',
    publishedAt: new Date('2023-03-10'),
    source: 'CNN Business'
  },
  {
    id: 'ukraine-conflict',
    headline: 'Russia Launches Military Operation Against Ukraine',
    content: 'Russia began a large-scale military operation against Ukraine early Thursday, with explosions reported in multiple Ukrainian cities including the capital Kyiv. President Vladimir Putin announced the operation in a televised address, claiming it was aimed at the "demilitarization and denazification" of Ukraine. Ukrainian President Volodymyr Zelensky declared martial law and called for international support. The assault has triggered the largest military conflict in Europe since World War II, with global implications for energy markets, food security, and international relations. Millions of Ukrainians have been displaced, with neighboring countries receiving waves of refugees.',
    publishedAt: new Date('2022-02-24'),
    source: 'BBC News'
  }
];

export default function StoryAnalyzer({ onStoryAnalyze, onTimelineChange, currentStory, isAnalyzing }: StoryAnalyzerProps) {
  const [customStory, setCustomStory] = useState({
    headline: '',
    content: '',
    source: 'Custom Input'
  });
  const [timelinePosition, setTimelinePosition] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTab, setSelectedTab] = useState('samples');

  const handleSampleStorySelect = useCallback((story: typeof SAMPLE_STORIES[0]) => {
    const newsStory: NewsStory = {
      ...story,
      id: story.id
    };
    onStoryAnalyze(newsStory);
  }, [onStoryAnalyze]);

  const handleCustomStorySubmit = useCallback(() => {
    if (!customStory.headline || !customStory.content) return;
    
    const newsStory: NewsStory = {
      id: `custom-${Date.now()}`,
      headline: customStory.headline,
      content: customStory.content,
      source: customStory.source,
      publishedAt: new Date()
    };
    
    onStoryAnalyze(newsStory);
  }, [customStory, onStoryAnalyze]);

  const handleTimelineChange = useCallback((value: number) => {
    setTimelinePosition(value);
    onTimelineChange(value);
  }, [onTimelineChange]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
    // In a real implementation, this would control timeline animation
  }, [isPlaying]);

  const resetTimeline = useCallback(() => {
    setTimelinePosition(0);
    onTimelineChange(0);
    setIsPlaying(false);
  }, [onTimelineChange]);

  return (
    <div className="absolute top-4 left-4 z-[1000] w-96">
      <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur shadow-lg">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            News Story Analyzer
          </h2>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="samples" className="text-sm">
                <FileText className="h-4 w-4 mr-1" />
                Samples
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-sm">
                <BarChart3 className="h-4 w-4 mr-1" />
                Custom
              </TabsTrigger>
            </TabsList>

            <TabsContent value="samples" className="space-y-3 mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Choose a sample news story to visualize:
              </div>
              
              {SAMPLE_STORIES.map((story) => (
                <div key={story.id} className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                     onClick={() => handleSampleStorySelect(story)}>
                  <h3 className="font-medium text-sm mb-1">{story.headline}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {story.content.substring(0, 120)}...
                  </p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">{story.source}</span>
                    <span className="text-xs text-gray-500">{story.publishedAt.toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Headline</label>
                  <Input
                    placeholder="Enter news headline..."
                    value={customStory.headline}
                    onChange={(e) => setCustomStory({...customStory, headline: e.target.value})}
                    className="text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Story Content</label>
                  <Textarea
                    placeholder="Paste the full news story content here..."
                    value={customStory.content}
                    onChange={(e) => setCustomStory({...customStory, content: e.target.value})}
                    className="text-sm min-h-[100px] resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Source</label>
                  <Input
                    placeholder="News source..."
                    value={customStory.source}
                    onChange={(e) => setCustomStory({...customStory, source: e.target.value})}
                    className="text-sm"
                  />
                </div>

                <Button 
                  onClick={handleCustomStorySubmit}
                  disabled={!customStory.headline || !customStory.content || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Story'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Timeline Controls - Show only when story is analyzed */}
          {currentStory && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Timeline Control</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={resetTimeline}>
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={togglePlayback}>
                    {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={timelinePosition}
                  onChange={(e) => handleTimelineChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Event Start</span>
                  <span>{timelinePosition}%</span>
                  <span>Current Time</span>
                </div>
              </div>
            </div>
          )}

          {/* Current Story Info */}
          {currentStory && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Analyzing:</h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs">
                <div className="font-medium mb-1">{currentStory.headline}</div>
                <div className="text-gray-600 dark:text-gray-400">{currentStory.source}</div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}