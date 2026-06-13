import { useState } from 'react';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listItem } from '@/lib/motion';
import { SearchYouTubeTab } from './TeacherVideoLibrary/SearchYouTubeTab';
import { MyLibraryTab } from './TeacherVideoLibrary/MyLibraryTab';
import { AttachToConceptTab } from './TeacherVideoLibrary/AttachToConceptTab';

export default function TeacherVideoLibraryPage() {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <>
      <SEOHead
        title="Video Library"
        description="Search, save, and manage educational videos for your classroom"
        canonical="/teacher/videos"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-6xl mx-auto space-y-6 pb-20"
      >
        <motion.div variants={listItem} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">Video Library</h1>
            <p className="text-sm text-muted-foreground">
              Search YouTube, save videos, and attach them to concepts
            </p>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
            <TabsTrigger value="search" className="gap-2">
              <Icon name="search" size={16} />
              <span className="hidden sm:inline">Search YouTube</span>
              <span className="sm:hidden">Search</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <Icon name="video_library" size={16} />
              <span className="hidden sm:inline">My Library</span>
              <span className="sm:hidden">Library</span>
            </TabsTrigger>
            <TabsTrigger value="attach" className="gap-2">
              <Icon name="attach_file" size={16} />
              <span className="hidden sm:inline">Attach to Concept</span>
              <span className="sm:hidden">Attach</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-6">
            <SearchYouTubeTab />
          </TabsContent>

          <TabsContent value="library" className="mt-6">
            <MyLibraryTab onTabChange={setActiveTab} />
          </TabsContent>

          <TabsContent value="attach" className="mt-6">
            <AttachToConceptTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </>
  );
}
