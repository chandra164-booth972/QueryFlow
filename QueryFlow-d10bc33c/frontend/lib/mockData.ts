export type QueryStatus = 'new' | 'reviewing' | 'requested_partial' | 'requested_full' | 'passed' | 'offered';

export interface Query {
  id: string;
  authorName: string;
  bookTitle: string;
  emailSubject: string;
  emailBody: string;
  dateReceived: string;
  status: QueryStatus;
  
  // AI Extracted Metadata (The Trust Layer)
  aiMetadata: {
    genre: string;
    wordCount: string;
    comps: string[];
    summary: string;
    fitScore: 'High' | 'Medium' | 'Low';
    fitReason: string;
    confidence: number; // 0-100
  };
  
  // Editor Tracking
  submissions?: {
    editorName: string;
    imprint: string;
    dateSent: string;
    status: 'Sent' | 'Reading' | 'Passed' | 'Offer';
    followUpDate?: string;
  }[];
}

// Use static dates to prevent hydration mismatches between server and client
const baseDate = new Date('2024-05-15T12:00:00Z').getTime();

export const mockQueries: Query[] = [
  {
    id: 'q1',
    authorName: 'Eleanor Vance',
    bookTitle: 'The Last Bookseller of Prague',
    emailSubject: 'QUERY: The Last Bookseller of Prague (Upmarket Historical Fiction)',
    emailBody: `Dear Amy Keene,

I am seeking representation for my 85,000-word upmarket historical fiction novel, THE LAST BOOKSELLER OF PRAGUE. Given your recent deals in narrative historical fiction and your stated interest in books about books, I thought this might be a strong fit for your list.

Set against the backdrop of the 1989 Velvet Revolution, the story follows a disillusioned antiquarian bookseller who discovers a coded manuscript that could expose a decades-old secret police operation. It combines the atmospheric tension of Carlos Ruiz Zafón's The Shadow of the Wind with the historical grounding of Anthony Doerr's All the Light We Cannot See.

I hold an MFA from the Iowa Writers' Workshop and my short fiction has appeared in The Paris Review.

Thank you for your time and consideration.

Best,
Eleanor Vance`,
    dateReceived: new Date(baseDate - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    status: 'new',
    aiMetadata: {
      genre: 'Upmarket Historical Fiction',
      wordCount: '85,000',
      comps: ['The Shadow of the Wind', 'All the Light We Cannot See'],
      summary: 'During the 1989 Velvet Revolution, an antiquarian bookseller finds a coded manuscript exposing a secret police operation.',
      fitScore: 'High',
      fitReason: 'Matches your explicit MSWL for "books about books" and recent deals in upmarket historical fiction.',
      confidence: 95,
    }
  },
  {
    id: 'q2',
    authorName: 'Marcus Thorne',
    bookTitle: 'Silicon Ghosts',
    emailSubject: 'Query: SILICON GHOSTS - Narrative Nonfiction',
    emailBody: `Hi Amy,

I'm writing to query SILICON GHOSTS, a 70,000-word narrative nonfiction project exploring the forgotten women who programmed the earliest supercomputers. 

I noticed you represent several prominent tech journalists, and I believe this untold history would appeal to readers of Hidden Figures and The Innovators.

I am a staff writer at Wired and have been researching this topic for three years.

Best regards,
Marcus Thorne`,
    dateReceived: new Date(baseDate - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    status: 'reviewing',
    aiMetadata: {
      genre: 'Narrative Nonfiction',
      wordCount: '70,000',
      comps: ['Hidden Figures', 'The Innovators'],
      summary: 'An exploration of the forgotten women who programmed early supercomputers, written by a Wired staff writer.',
      fitScore: 'High',
      fitReason: 'Strong platform (Wired staff writer) and aligns with your narrative nonfiction focus.',
      confidence: 92,
    }
  },
  {
    id: 'q3',
    authorName: 'Sarah Jenkins',
    bookTitle: 'The Dragon\'s Tear',
    emailSubject: 'Query: Epic Fantasy - The Dragon\'s Tear',
    emailBody: `Dear Ms. Keene,

Please consider my 150,000 word epic fantasy, THE DRAGON'S TEAR. It is the first in a planned 7-book series.

When young farm boy Elian discovers a glowing rock, he realizes he is the chosen one destined to defeat the Dark Lord Malakor.

Thank you,
Sarah`,
    dateReceived: new Date(baseDate - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    status: 'new',
    aiMetadata: {
      genre: 'Epic Fantasy',
      wordCount: '150,000',
      comps: [],
      summary: 'A farm boy discovers he is the chosen one destined to defeat a Dark Lord in a 7-book epic fantasy series.',
      fitScore: 'Low',
      fitReason: 'You do not typically represent Epic Fantasy, and the word count (150k) is unusually high for a debut.',
      confidence: 88,
    }
  },
  {
    id: 'q4',
    authorName: 'David Chen',
    bookTitle: 'Echoes of the Valley',
    emailSubject: 'Query: Echoes of the Valley (Literary Fiction)',
    emailBody: `Dear Amy,

I am submitting ECHOES OF THE VALLEY, a 65,000-word literary debut about a fractured family reuniting in California's Central Valley after the death of their patriarch.

It explores themes of generational trauma and agricultural decline, similar to the works of John Steinbeck but with a modern, diverse perspective.

Best,
David`,
    dateReceived: new Date(baseDate - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    status: 'requested_partial',
    aiMetadata: {
      genre: 'Literary Fiction',
      wordCount: '65,000',
      comps: ['John Steinbeck (Thematic)'],
      summary: 'A literary debut about a fractured family reuniting in the Central Valley after their patriarch\'s death, exploring generational trauma.',
      fitScore: 'Medium',
      fitReason: 'Fits your literary debut interest, though word count is slightly on the shorter side.',
      confidence: 85,
    },
    submissions: [
      {
        editorName: 'Julia Brown',
        imprint: 'Knopf',
        dateSent: new Date(baseDate - 1000 * 60 * 60 * 24 * 5).toISOString(),
        status: 'Reading',
        followUpDate: new Date(baseDate + 1000 * 60 * 60 * 24 * 14).toISOString()
      }
    ]
  }
];
