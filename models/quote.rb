require 'mongoid'

class Quote
  include Mongoid::Document
  include Mongoid::Timestamps

  field :number, :type => Integer     # intenral quote number
  field :qdate, :type => Date         # date on which the quote is released
  
  field :titles, :type => Array       # array of string with movie titles
  field :audiourl, :type => String    # url to audio file
  field :addinfo, :type => String     # additional information (optional)
  
  field :commits, :type => Integer, :default => 0
  field :solutions, :type => Integer, :default => 0
  
  field :buy, :type => String                       # link to amazon
  field :info, :type => String                      # link to imdb
  field :stream, :type => String                    # link to videomax/itunes
  field :trailer, :type => String                   # link to youtube

  index :number, unique: true
end
