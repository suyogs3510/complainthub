import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    {
      question: 'How do I submit a complaint?',
      answer: 'To submit a complaint, login to your account, go to the dashboard, click "New Complaint", fill out the form with the necessary details, and submit. You can also attach images and share your location for faster resolution.'
    },
    {
      question: 'How do I track the status of my complaint?',
      answer: 'You can track the status of your complaint in the "My Complaints" section of your dashboard. Each complaint shows its current status: Pending, In Progress, or Resolved.'
    },
    {
      question: 'Can I edit my complaint after submitting?',
      answer: 'You can edit your complaint only if it is still in "Pending" status. Once the admin starts working on it (In Progress or Resolved), the complaint can no longer be edited.'
    },
    {
      question: 'What should I do if my complaint is about ragging?',
      answer: 'If your complaint is about ragging, select "Ragging" as the category. This will immediately flag it as a high-priority emergency and notify the admin team with urgency.'
    },
    {
      question: 'How do I change my profile information?',
      answer: 'Go to your dashboard, navigate to the "Profile" section, click "Edit Profile", make the necessary changes, and save.'
    },
    {
      question: 'What happens after I submit a complaint?',
      answer: 'After you submit a complaint, it is marked as "Pending". An admin will review it, update the status to "In Progress", and work on resolving it. You will be able to see any admin replies or attached documents.'
    },
    {
      question: 'Can I delete a complaint I submitted?',
      answer: 'Currently, you cannot delete a complaint once submitted to ensure transparency. However, if you made a mistake, you can contact the admin team for assistance.'
    },
    {
      question: 'What are the complaint categories available?',
      answer: 'The available categories are: Academic, Administrative, Facilities, Faculty, Hostel, Library, Transportation, Electricity, Cleaning, Ragging, and Other.'
    }
  ]

  return (
    <div className="container py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="btn secondary">
            <Home size={16} />
            Back
          </Link>
          <h1 className="font-display text-3xl font-bold">Frequently Asked Questions</h1>
        </div>

        <div className="col gap-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between text-left py-4"
              >
                <strong className="text-lg">{faq.question}</strong>
                {openIndex === index ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-muted-foreground pb-4">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
