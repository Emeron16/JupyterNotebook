import nltk
from nltk.stem.porter import PorterStemmer
import numpy as np

# Download required NLTK data
try:
    nltk.download('punkt')
    nltk.download('punkt_tab')
    print("NLTK data downloaded successfully!")
except Exception as e:
    print(f"Error downloading NLTK data: {e}")

# Initialize stemmer
stemmer = PorterStemmer()

def tokenize(sentence):
    """
    Split sentence into array of words/tokens
    A token can be a word or punctuation character, or number
    """
    try:
        return nltk.word_tokenize(sentence)
    except LookupError:
        print("NLTK data not found. Downloading...")
        nltk.download('punkt')
        nltk.download('punkt_tab')
        return nltk.word_tokenize(sentence)

def stem(word):
    """
    Stemming = find the root form of the word
    examples:
    words = ["organize", "organizes", "organizing"]
    words = [stem(w) for w in words]
    -> ["organ", "organ", "organ"]
    """
    return stemmer.stem(word.lower())

def bag_of_words(tokenized_sentence, words):
    """
    Return bag of words array:
    1 for each known word that exists in the sentence, 0 otherwise
    example:
    sentence = ["hello", "how", "are", "you"]
    words = ["hi", "hello", "I", "you", "bye", "thank", "cool"]
    bag   = [  0 ,    1 ,    0 ,   1 ,    0 ,     0 ,      0]
    """
    # Stem each word
    sentence_words = [stem(word) for word in tokenized_sentence]
    # Initialize bag with 0 for each word
    bag = np.zeros(len(words), dtype=np.float32)
    for idx, w in enumerate(words):
        if w in sentence_words: 
            bag[idx] = 1

    return bag
